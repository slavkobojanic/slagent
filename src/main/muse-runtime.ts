import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import { randomUUID } from "node:crypto"
import {
  MuseHostStartError,
  readSessionDurability,
  Session,
  spawnMspConnection,
  type ExitClassification,
  type ProcessExit,
  type SpawnedMspConnection,
} from "@muse-code/sdk"
import type {
  ApprovalRequestParams,
  Item,
  SubscriptionUsage,
  ItemDeltaParams,
  ModelCatalogEntry,
  SessionContextUsageParams,
  SessionModelChangedParams,
  SessionTodoListChangedParams,
  SessionTokenUsageParams,
  TurnCompletedParams,
  TurnInputPart,
  TurnUnqueuedParams,
  UserInputRequestParams,
} from "@muse-code/sdk/dist/src/msp.js"
import type {
  AssistantMessage,
  ChatMessage,
  EffortLevel,
  ModelOption,
  MuseSubscriptionUsage,
  Personalisation,
  PromptRequest,
  QueueMode,
  QuestionReply,
  QuestionRequest,
  RewindMode,
  RewindResult,
  RuntimeTranscript,
  SlashCommand,
  TaskInfo,
  TodoItem,
  ToolMessage,
  UsageState,
  UserAttachment,
  UserMessage,
} from "../shared/types"
import { CHAT_SYSTEM_PROMPT } from "./chat-prompt"

import { systemPromptAppend } from "./extensions/personalisation"
import { errorMessage, toolLabel, truncate } from "./format"
import { ToolDescriber, type ToolCallSeed } from "./describe"
import { preparePrompt, queueDetail } from "./prompt"

// Chats on these models run the user's own Muse Code install through the
// official @muse-code/sdk, so they sign in with whatever login Muse Code has:
// a Meta Muse subscription. The SDK spawns `muse serve` and speaks the Muse
// Session Protocol, so no API key is involved.

export const MUSE_PREFIX = "muse/"

// The host's catalog default, before a real catalog was probed. A runtime
// started on it omits the model at session start, so Muse's own default runs.
export const MUSE_DEFAULT_ID = `${MUSE_PREFIX}default`

// Muse Code's context window when the catalog reports no limit. Real catalogs
// replace this list; see museCatalog().
export const MUSE_CONTEXT_WINDOW = 1_007_997

export const MUSE_MODELS: ModelOption[] = [
  { id: MUSE_DEFAULT_ID, name: "Muse", contextWindow: MUSE_CONTEXT_WINDOW, reasoning: true, provider: "muse" },
]

export function isMuseModel(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(MUSE_PREFIX))
}

export function museModel(id: string | null | undefined): ModelOption | undefined {
  return MUSE_MODELS.find((model) => model.id === id)
}

// The real model catalog, read from a short-lived host. Empty when Muse Code
// is missing or has never signed in, so the picker hides the section.
export async function museCatalog(): Promise<ModelOption[]> {
  const muse = findMuse()
  if (!muse) return []
  let connection: SpawnedMspConnection | null = null
  try {
    connection = await spawnMspConnection({
      command: muse,
      args: ["serve"],
      cwd: homedir(),
      env: museEnv(),
      onStderr: () => {},
    }).initialize({ clientInfo: MUSE_CLIENT })
    const result = await connection.connection.command("model/list", {})
    const entries = (result.models ?? []) as ModelCatalogEntry[]
    return entries.map((entry) => ({
      id: museModelId(entry.modelId),
      name: entry.displayLabel || entry.modelId,
      contextWindow: entry.contextLimit ?? MUSE_CONTEXT_WINDOW,
      reasoning: true,
      provider: "muse",
    }))
  } catch {
    return []
  } finally {
    await connection?.close().catch(() => undefined)
  }
}

export function museModelId(modelId: string): string {
  return modelId.startsWith(MUSE_PREFIX) ? modelId : MUSE_PREFIX + modelId
}

// Whether the user's own Muse Code install is present at all. New Muse chats
// refuse with an install hint when it is not.
export function museInstalled(): boolean {
  return findMuse() !== null
}

function sdkModel(modelId: string): string | undefined {
  const raw = modelId.startsWith(MUSE_PREFIX) ? modelId.slice(MUSE_PREFIX.length) : modelId
  return raw === "default" ? undefined : raw
}

const MUSE_CLIENT = { name: "slagent", version: "1.0.0" }

const OUTPUT_LIMIT = 12_000

// Muse Code's tool calls reach the view without their raw arguments, so labels
// come from the host's display labels; unknown names render generically.

type Pending = {
  id: string
  mode: QueueMode
  request: PromptRequest
}

type SavedFile = {
  url: string
  path: string
}

type OpenQuestion = {
  request: QuestionRequest
  resolve: (reply: QuestionReply | null) => void
}

export type MuseRuntimeOptions = {
  projectId: string
  chatId: string
  cwd: string
  mode?: "chat"
  sessionId: string | null
  modelId: string
  // Reasoning effort for Muse models, passed as the turn's reasoningEffort.
  effort: EffortLevel
  named: boolean
  titleGenerated: boolean
  onChange: (runningChanged: boolean) => void
  onSession: (sessionId: string) => void
  onTitle: (title: string, generated: boolean) => void
  generateTitle: (user: string) => Promise<string | null>
  // Short model-written labels for tool steps, thinking and the working
  // shimmer. Optional: without a small model the fallback labels stay.
  describeToolCalls?: (calls: ToolCallSeed[]) => Promise<Map<string, string>> | null
  describeThinkingLabel?: (excerpt: string) => Promise<string | null>
  describeWorkingLabel?: (user: string) => Promise<string | null>
  // Whether a small model is available to write labels at all.
  describable?: () => boolean
  onModel: (modelId: string) => void
  onSettled: () => void
  onUsage: (usage: UsageState) => void
  // Per-model completion usage, so the usage log gets Muse rows.
  onUsageRecord?: (record: {
    model: string | null
    usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  }) => void
  // The subscription's rolling usage windows, as of each observation.
  onSubscriptionUsage?: (usage: MuseSubscriptionUsage) => void
  onQuestion: (request: QuestionRequest) => void
  // Keeps a proposed plan across restarts, so a crash shows it again.
  planProposal?: string | null
  onPlanProposal: (plan: string | null) => void
  saveBytes: (name: string, mimeType: string, bytes: Buffer) => Promise<SavedFile>
  // Global personalisation, re-read on every run so edits apply from the next message.
  personalisation: () => Personalisation
}

export class MuseRuntime {
  readonly projectId: string
  readonly chatId: string
  readonly provider = "muse" as const
  modelId: string
  modelName: string
  messages: ChatMessage[] = []
  private queue: Pending[] = []
  private streaming = false
  private sending = false
  private notice: string | null = null
  private noticeIsError = false
  private usageState: UsageState | null = null
  private todos: TodoItem[] = []
  private planEnabled = false
  private planProposal: string | null
  private question: OpenQuestion | null = null
  private named: boolean
  private titleGenerated: boolean
  private sessionId: string | null
  private client: SpawnedMspConnection | null = null
  private session: Session | null = null
  private opening: Promise<Session> | null = null
  // The personalisation fragment the live host was created with. Muse has no
  // system-prompt seam, so the fragment rides the first turn's text parts.
  private sessionPersonalisation: string | null = null
  private lastTurnId: string | null = null
  private lastContextTokens: number | null = null
  private lastContextWindow: number | null = null
  // Reply bubbles and reasoning bubbles, keyed by their item id.
  private bubbles = new Map<string, string>()
  private streamed = new Set<string>()
  private lastRunning = false
  private disposed = false
  private thinkingAsked = false
  private readonly describer: ToolDescriber
  private effort: EffortLevel
  private pendingEffort: EffortLevel | null = null
  private readonly options: MuseRuntimeOptions

  constructor(options: MuseRuntimeOptions) {
    this.options = options
    this.projectId = options.projectId
    this.chatId = options.chatId
    this.planProposal = options.planProposal ?? null
    this.modelId = options.modelId
    this.modelName = museModel(options.modelId)?.name ?? options.modelId
    this.effort = options.effort
    this.named = options.named
    this.titleGenerated = options.titleGenerated
    this.sessionId = options.sessionId
    this.describer = new ToolDescriber(
      (calls) => this.options.describeToolCalls?.(calls) ?? null,
      (id, label) => {
        const tool = this.findTool(id)
        if (!tool) return
        tool.label = label
        tool.labelPending = false
        this.emit(false)
      },
      (id) => {
        const tool = this.findTool(id)
        if (!tool || !tool.labelPending) return
        tool.labelPending = false
        this.emit(false)
      },
    )
  }

  get key(): string {
    return `${this.projectId}:${this.chatId}`
  }

  get running(): boolean {
    return this.streaming || this.sending
  }

  get waiting(): boolean {
    return this.planProposal !== null || this.question !== null
  }

  get failed(): boolean {
    if (this.running) return false
    if (this.notice) return this.noticeIsError
    const last = this.messages[this.messages.length - 1]
    return last?.role === "assistant" && Boolean(last.error)
  }

  get runningTasks(): number {
    return 0
  }

  load(messages: ChatMessage[]): void {
    this.messages = messages.map((message) => {
      if (message.role === "user" && !message.attachments) message.attachments = []
      if (message.role === "tool" && !message.images) message.images = []
      return message
    })
  }

  // The Muse host starts with the first message, not when the chat opens.
  async open(): Promise<null> {
    return null
  }

  lockTitle(): void {
    this.named = true
    this.titleGenerated = true
  }

  transcript(): RuntimeTranscript {
    return {
      messages: this.messages,
      streaming: this.running,
      notice: this.notice,
      queue: this.queue.map((item) => ({
        id: item.id,
        text: item.request.text,
        mode: item.mode,
        detail: queueDetail(item.request),
      })),
      usage: this.usageState,
      todos: this.todos,
      planMode: this.planEnabled,
      planProposal: this.planProposal,
      question: this.question?.request ?? null,
      tasks: [],
    }
  }

  commands(): SlashCommand[] {
    return this.slashCommands
  }

  private slashCommands: SlashCommand[] = []

  async prompt(request: PromptRequest): Promise<void> {
    const open = this.question
    if (open && request.text.trim() && request.files.length === 0) {
      this.answerQuestion(open.request.id, { skipped: true, message: request.text.trim() })
      return
    }
    if (this.running) {
      this.enqueue(request, "follow-up")
      return
    }
    await this.send(request)
  }

  async setQueueMode(id: string, mode: QueueMode): Promise<void> {
    const index = this.queue.findIndex((item) => item.id === id)
    const item = this.queue[index]
    if (!item) return
    if (mode === "follow-up" || !this.streaming) {
      item.mode = mode
      this.emit(false)
      return
    }
    // Muse folds a message sent mid-turn into the running turn as a steer.
    this.queue.splice(index, 1)
    await this.push(item.request)
  }

  removeQueued(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id)
    this.emit(false)
  }

  async abort(): Promise<void> {
    this.settleQuestion(null)
    const session = this.session
    if (!session || !this.running) return
    try {
      await this.command("turn/interrupt", session, this.lastTurnId ? { turnId: this.lastTurnId } : {})
    } catch {
      // The turn may already have settled; the terminal still arrives.
    }
  }

  async setModel(modelId: string): Promise<boolean> {
    const model = museModel(modelId)
    if (!model) throw new Error("That model is not available.")
    if (this.running) throw new Error("Wait for the run to finish.")
    const session = await this.opening?.catch(() => null)
    if (session && sdkModel(model.id)) {
      await this.command("session/setModel", session, { model: { modelId: sdkModel(model.id) } })
    }
    this.modelId = model.id
    this.modelName = model.name
    this.options.onModel(model.id)
    this.emit(false)
    return true
  }

  // The tier applies between turns. While a run streams, hold the level until
  // the next turn starts, where push passes it.
  setEffort(effort: EffortLevel): void {
    if (this.running) {
      this.pendingEffort = effort
      return
    }
    void this.applyEffort(effort)
  }

  private async applyEffort(effort: EffortLevel): Promise<void> {
    this.effort = effort
    const session = await this.opening?.catch(() => null)
    if (!session) return
    try {
      await this.command("session/setReasoningEffort", session, { reasoningEffort: effort })
    } catch {
      // The next turn passes the level as a submission option.
    }
  }

  setPlanMode(_enabled: boolean): void {
    throw new Error("Plan mode isn't available in Muse chats yet.")
  }

  async approvePlan(): Promise<void> {
    if (!this.planProposal) throw new Error("There is no plan to approve.")
    throw new Error("Plan mode isn't available in Muse chats yet.")
  }

  answerQuestion(id: string, reply: QuestionReply): void {
    if (!this.question || this.question.request.id !== id) throw new Error("That question was already answered.")
    this.settleQuestion(reply)
  }

  async compact(): Promise<void> {
    if (this.running) throw new Error("Wait for the run to finish.")
    const session = await this.opening?.catch(() => null)
    if (!session) return
    this.pushUser({ text: "/compact", mentions: [], files: [] }, [])
    await this.command("session/compact", session, {})
  }

  async editMessage(_id: string, _text: string): Promise<void> {
    throw new Error("Editing sent messages isn't available in Muse chats yet.")
  }

  async rewind(_id: string, _mode: RewindMode): Promise<RewindResult> {
    throw new Error("Rewind isn't available in Muse chats yet.")
  }

  async undoRewind(_commit: string): Promise<void> {
    throw new Error("Rewind isn't available in Muse chats yet.")
  }

  async turnDiff(): Promise<string> {
    return ""
  }

  taskOutput(_id: string): string {
    return ""
  }

  stopTask(_id: string): void {}

  // Muse chats have no slagent background tasks yet.
  get tasks(): TaskInfo[] {
    return []
  }

  dispose(): void {
    this.disposed = true
    this.describer.stop()
    this.settleQuestion(null)
    const client = this.client
    this.client = null
    this.session = null
    this.opening = null
    if (client) void client.close().catch(() => undefined)
  }

  private setProposal(plan: string | null): void {
    if (plan === this.planProposal) return
    this.planProposal = plan
    this.options.onPlanProposal(plan)
  }

  private async send(request: PromptRequest): Promise<void> {
    this.sending = true
    this.setProposal(null)
    this.setNotice(null)
    const pendingEffort = this.pendingEffort
    this.pendingEffort = null
    if (pendingEffort) this.effort = pendingEffort
    // Todo lists belong to the turn that created them; drop the previous
    // turn's list so a finished list doesn't linger over the new ask.
    this.todos = []
    this.emit(true)
    try {
      await this.push(request)
    } catch (error) {
      this.sending = false
      this.setNotice(museError(error), true)
      this.emit(true)
      throw error
    }
  }

  private async push(request: PromptRequest): Promise<void> {
    const session = await this.ensureSession()
    const prepared = await preparePrompt(request, this.options.saveBytes)
    this.pushUser(request, prepared.attachments)
    this.emit(false)
    const parts: TurnInputPart[] = []
    const intro = this.introText()
    if (intro) parts.push({ type: "text", text: intro })
    parts.push({ type: "text", text: prepared.text })
    for (const image of prepared.images) {
      parts.push({ type: "image", base64Data: image.data, mediaType: image.mimeType })
    }
    // A "/selector args" prompt submits as a skill part, the wire twin of the
    // TUI's shortcut tokens; the plain text stays as narration otherwise.
    const skill = this.skillPart(request.text)
    const ack = await session.sendUserTurn({
      input: skill ? [skill] : parts,
      reasoningEffort: this.effort,
      ...(this.streaming ? { ifBusy: "steer" as const } : {}),
    })
    this.lastTurnId = ack.turnId
    this.sessionId = session.sessionId
  }

  // The system fragment the host has not seen yet. Muse has no system-prompt
  // seam, so the fragment rides the first turn as a plain text part; the
  // transcript shows the user's own words through our locally pushed message.
  private introText(): string | null {
    const append = systemPromptAppend(this.options.personalisation())
    if (this.sessionPersonalisation === append) return null
    this.sessionPersonalisation = append
    if (this.options.mode === "chat") return CHAT_SYSTEM_PROMPT + (append ? `\n\n${append}` : "")
    return append
  }

  // A "/selector args" prompt becomes a skill submission, the wire twin of the
  // TUI's shortcut tokens. "/compact" is a real protocol command instead.
  private skillPart(text: string): TurnInputPart | null {
    const trimmed = text.trim()
    if (!trimmed.startsWith("/")) return null
    const [token, ...rest] = trimmed.slice(1).split(" ")
    const selector = this.slashCommands.find((command) => command.name === token)?.name
    if (!selector || selector === "compact") return null
    return { type: "skill", selector, ...(rest.length > 0 ? { arguments: rest.join(" ") } : {}) }
  }

  // One Muse host per chat, kept alive between turns so the session stays warm.
  private ensureSession(): Promise<Session> {
    if (this.opening) return this.opening
    this.opening = this.spawn().catch((error) => {
      this.opening = null
      throw error
    })
    return this.opening
  }

  private async spawn(): Promise<Session> {
    const muse = findMuse()
    const handshake = spawnMspConnection({
      command: muse ?? "muse",
      args: ["serve"],
      cwd: this.options.cwd,
      env: museEnv(),
      onStderr: () => {},
    })
    const client = await handshake.initialize({ clientInfo: MUSE_CLIENT }).catch((error) => {
      if (error instanceof MuseHostStartError) throw new Error(museError(error))
      throw error
    })
    this.client = client
    client.connection.onNotification((notification) => this.onNotification(notification))
    void client.exited.then((exit) => this.onHostExit(client, exit))
    const durability = readSessionDurability(client.initializeResult)
    let sessionId: string
    if (this.sessionId) {
      const resumed = await client.connection.command("session/resume", {
        sessionId: this.sessionId,
        excludeItems: true,
      })
      sessionId = (resumed.session as { sessionId: string }).sessionId
    } else {
      const modelId = sdkModel(this.modelId)
      const started = await client.connection.command("session/start", {
        workspaceRoot: this.options.cwd,
        ...(modelId ? { modelId } : {}),
      })
      sessionId = (started.session as { sessionId: string }).sessionId
    }
    this.sessionId = sessionId
    this.options.onSession(sessionId)
    const session = new Session({ sessionId, durability, connection: client.connection })
    session.onApproval((request) => this.approve(request))
    this.session = session
    void this.loadCommands(session)
    return session
  }

  // The facade keeps its connection private; commands ride the client we own.
  private async command(method: string, session: Session, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const connection = this.client?.connection
    if (!connection) throw new Error("The Muse host is not running.")
    return connection.command(method, { sessionId: session.sessionId, ...params })
  }

  // Every tool call is allowed once, like the Claude path. Muse's own default
  // posture without a handler is deny, which would make every chat useless.
  private approve(request: ApprovalRequestParams): { choiceId: string; feedback: null } {
    const choices = request.availableChoices ?? []
    const allow = choices.find((choice) => choice.decision === "approved")
    return { choiceId: (allow ?? choices[0])?.choiceId ?? "allow_once", feedback: null }
  }

  private async loadCommands(session: Session): Promise<void> {
    const commands: SlashCommand[] = [
      { name: "compact", insert: "/compact", description: "Summarize the conversation so far", kind: "command" },
    ]
    try {
      const result = await this.command("skill/list", session, {})
      const skills = (result.skills ?? []) as { selector: string; description?: string }[]
      for (const skill of skills) {
        commands.push({
          name: skill.selector,
          insert: `/${skill.selector} `,
          description: skill.description ?? "",
          kind: "command",
        })
      }
    } catch {
      // The composer keeps working without suggestions.
    }
    this.slashCommands = commands
    this.emit(false)
  }

  // The single event path. Everything the host streams reaches the transcript
  // here; the fold only backfills the turn handles and approvals.
  private onNotification(notification: { method: string; params?: unknown }): void {
    const session = this.session
    if (session) session.apply(notification)
    const params = notification.params as Record<string, unknown> | undefined
    switch (notification.method) {
      case "item/started":
      case "item/updated":
      case "item/completed":
        if (isItem(params)) this.onItem(params.item, notification.method)
        return
      case "item/delta":
        if (isDelta(params)) this.onDelta(params)
        return
      case "turn/started":
        this.startTurn()
        return
      case "turn/completed":
        if (isTurnCompleted(params)) this.onTurnCompleted(params)
        return
      case "turn/unqueued":
        if (isTurnUnqueued(params)) this.onTurnUnqueued(params)
        return
      case "userInput/requested":
        if (isUserInput(params)) this.askUserInput(params)
        return
      case "userInput/settled":
        this.settleQuestion(null)
        return
      case "session/tokenUsage":
        if (isTokenUsage(params)) {
          this.onTokenUsage(params.cumulative)
          if (params.usage && params.modelId) this.options.onUsageRecord?.({ model: params.modelId, usage: params.usage })
        }
        return
      case "usage/changed":
        if (isSubscriptionUsage(params)) this.options.onSubscriptionUsage?.(subscriptionUsage(params))
        return
      case "session/contextUsage":
        if (isContextUsage(params)) this.onContextUsage(params)
        return
      case "session/todoListChanged":
        if (isTodoList(params)) this.onTodoList(params)
        return
      case "session/modelChanged":
        if (isModelChanged(params)) this.onModelChanged(params)
        return
      case "session/statusChanged":
        if (params?.status === "compacting") this.setNotice("Summarizing earlier messages")
        else if (this.notice === "Summarizing earlier messages") this.setNotice(null)
        this.emit(false)
        return
    }
  }

  private onItem(item: Item, phase: string): void {
    if (item.kind === "userMessage") return
    if (item.kind === "agentMessage") {
      const bubble = this.bubbleFor(item.itemId)
      if (phase === "item/completed" && typeof item.text === "string") {
        if (!this.streamed.has(item.itemId)) bubble.text = item.text
        bubble.streaming = true
      }
      this.emit(false)
      return
    }
    if (item.kind === "reasoning") {
      const bubble = this.bubbleFor(item.itemId)
      if (phase === "item/completed" && Array.isArray(item.summary)) {
        if (!this.streamed.has(item.itemId)) {
          bubble.thinking = item.summary.join("")
          this.maybeDescribeThinking(bubble)
        }
      }
      this.emit(false)
      return
    }
    if (item.kind === "compaction") {
      if (item.status === "inProgress") this.setNotice("Summarizing earlier messages")
      else if (this.notice === "Summarizing earlier messages") this.setNotice(null)
      this.emit(false)
      return
    }
    // Everything else — tool calls, subagents, shells, web searches, unknown
    // kinds — renders as a tool step.
    this.onToolItem(item, phase)
  }

  private onToolItem(item: Item, phase: string): void {
    let tool = this.findTool(item.itemId)
    if (!tool) {
      const name = item.kind === "toolCall" ? (item.tool ?? "tool") : item.kind
      tool = {
        id: item.itemId,
        role: "tool",
        name,
        label: this.toolLabelFor(item),
        args: item.statusLine ?? "",
        output: "",
        images: [],
        running: item.status === "inProgress",
        isError: isFailedStatus(item.status),
      }
      this.messages.push(tool)
      if (!tool.running && this.options.describable?.()) {
        tool.labelPending = true
        this.describer.add({ id: item.itemId, name, args: item.statusLine ?? item.fallbackText ?? "" })
      }
      // Text after a tool step belongs in a new bubble below it.
      for (const id of this.bubbles.values()) {
        const bubble = this.messages.find((message) => message.id === id)
        if (bubble?.role === "assistant") bubble.streaming = false
      }
      this.bubbles.clear()
    }
    if (phase !== "item/started") {
      tool.label = this.toolLabelFor(item)
      tool.labelPending = false
      if (typeof item.visibleOutput === "string") tool.output = truncate(item.visibleOutput, OUTPUT_LIMIT)
      tool.running = item.status === "inProgress"
      tool.isError = isFailedStatus(item.status)
    }
    this.emit(false)
  }

  private toolLabelFor(item: Item): string {
    const label = item.displayLabel
    if (label) return item.status === "inProgress" ? label.active : isFailedStatus(item.status) ? label.neutral : label.done
    return toolLabel(item.kind === "toolCall" ? (item.tool ?? "tool") : item.kind, {})
  }

  private onDelta(delta: ItemDeltaParams): void {
    const field = delta.field ?? "text"
    if (field === "text" || field.startsWith("summary")) {
      const item = this.messages.find((message) => message.id === this.bubbles.get(delta.itemId))
      if (item?.role !== "assistant") return
      this.streamed.add(delta.itemId)
      if (field === "text") item.text += delta.delta
      else {
        item.thinking += delta.delta
        this.maybeDescribeThinking(item)
      }
      this.emit(false)
      return
    }
    if (field === "output") {
      const tool = this.findTool(delta.itemId)
      if (!tool) return
      tool.output = truncate((tool.output ?? "") + delta.delta, OUTPUT_LIMIT)
      this.emit(false)
    }
  }

  private onTurnCompleted(params: TurnCompletedParams): void {
    if (this.notice && !this.noticeIsError) this.setNotice(null)
    if (params.terminal === "failed") {
      const detail = params.error?.message ?? params.reason ?? "Muse Code stopped with an error."
      this.setNotice(detail, true)
    }
    if (params.terminal === "completed" || params.terminal === "cancelled") {
      this.streaming = false
      this.sending = false
      this.finishStreamingMessages()
      this.emit(true)
      this.options.onSettled()
      queueMicrotask(() => void this.flushFollowUp())
    }
  }

  // A queued submit was reclaimed before launching; our queue is client-side,
  // so this only settles a steer that never started.
  private onTurnUnqueued(_params: TurnUnqueuedParams): void {}

  private onTokenUsage(cumulative: {
    promptTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    totalTokens?: number
  }): void {
    const contextWindow = this.lastContextWindow ?? museModel(this.modelId)?.contextWindow ?? MUSE_CONTEXT_WINDOW
    this.usageState = {
      contextTokens: this.lastContextTokens,
      contextWindow,
      percent: this.lastContextTokens === null ? null : Math.min(100, (this.lastContextTokens / contextWindow) * 100),
      inputTokens: cumulative.promptTokens ?? 0,
      outputTokens: cumulative.outputTokens ?? 0,
      cacheTokens: (cumulative.cacheReadTokens ?? 0) + (cumulative.cacheWriteTokens ?? 0),
      totalTokens: cumulative.totalTokens ?? 0,
      // A subscription isn't billed per token, so the estimate isn't a cost.
      cost: 0,
    }
    this.options.onUsage(this.usageState)
  }

  private onContextUsage(params: SessionContextUsageParams): void {
    this.lastContextTokens = params.usedTokens
    if (params.windowTokens) this.lastContextWindow = params.windowTokens
    const usage = this.usageState
    this.onTokenUsage(
      usage
        ? {
            promptTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cacheReadTokens: usage.cacheTokens,
            cacheWriteTokens: 0,
            totalTokens: usage.totalTokens,
          }
        : {},
    )
  }

  private onTodoList(params: SessionTodoListChangedParams): void {
    this.todos = params.items.map((todo) => ({
      text: todo.text,
      status: todo.status === "inProgress" ? "in_progress" : todo.status === "completed" ? "completed" : "pending",
    }))
    this.emit(false)
  }

  private onModelChanged(params: SessionModelChangedParams): void {
    this.modelId = museModelId(params.modelId)
    this.modelName = params.modelId
    this.options.onModel(this.modelId)
    this.emit(false)
  }

  private async askUserInput(params: UserInputRequestParams): Promise<void> {
    const questions = params.questions.map((question) => ({
      id: question.id,
      question: question.question,
      ...(question.header ? { header: question.header } : {}),
      multiSelect: question.selection.mode === "multiple",
      options: question.options.map((option) => ({
        label: option.label,
        ...(option.description ? { description: option.description } : {}),
      })),
    }))
    if (questions.length === 0) return
    this.settleQuestion(null)
    const request: QuestionRequest = { id: params.userInputId, questions }
    const reply = await new Promise<QuestionReply | null>((resolve) => {
      this.question = { request, resolve }
      this.emit(true)
      this.options.onQuestion(request)
    })
    await this.submitUserInput(params, questions, reply)
  }

  private async submitUserInput(
    params: UserInputRequestParams,
    questions: QuestionRequest["questions"],
    reply: QuestionReply | null,
  ): Promise<void> {
    const session = this.session
    if (!session) return
    if (!reply || (reply.skipped && !reply.message)) {
      await this.command("userInput/cancel", session, {
        reason: reply?.skipped ? "The user skipped the questions." : "The question was cancelled before the user answered.",
        userInputId: params.userInputId,
      }).catch(() => undefined)
      return
    }
    const answers = reply.skipped
      ? questions.map((question) => ({ questionId: question.id, freeText: reply.message }))
      : questions.map((question) => {
          const answer = reply.answers.find((item) => item.questionId === question.id)
          const picked = [...(answer?.selected ?? [])]
          if (answer?.other) picked.push(answer.other)
          if (question.multiSelect) {
            return {
              questionId: question.id,
              ...(picked.length > 0 ? { selectedLabels: picked } : { freeText: answer?.note ?? "" }),
              ...(answer?.note ? { note: answer.note } : {}),
            }
          }
          if (picked.length > 0) return { questionId: question.id, selectedLabel: picked[0], ...(answer?.note ? { note: answer.note } : {}) }
          return { questionId: question.id, freeText: answer?.other ?? answer?.note ?? "" }
        })
    await this.command("userInput/answer", session, { answers, userInputId: params.userInputId }).catch(() => undefined)
  }

  private settleQuestion(reply: QuestionReply | null): void {
    const open = this.question
    if (!open) return
    this.question = null
    open.resolve(reply)
    this.emit(true)
  }

  private onHostExit(client: SpawnedMspConnection, _exit: ProcessExit): void {
    if (this.client !== client || this.disposed) return
    void client.child.exit.then((classified) => {
      if (this.client !== client || this.disposed) return
      this.session?.hostExited(classified)
      this.client = null
      this.session = null
      this.opening = null
      // The process ended, so the next message starts a fresh one that resumes.
      if (!this.running) return
      this.streaming = false
      this.sending = false
      this.finishStreamingMessages()
      if (classified.kind !== "cleanShutdown") this.setNotice(museExitNotice(classified), true)
      this.emit(true)
      this.options.onSettled()
    })
  }

  private startTurn(): void {
    if (this.streaming) return
    this.streaming = true
    this.sending = false
    this.emit(true)
  }

  private bubbleFor(itemId: string): AssistantMessage {
    const existingId = this.bubbles.get(itemId)
    if (existingId) {
      const existing = this.messages.find((message) => message.id === existingId)
      if (existing?.role === "assistant") return existing
    }
    const message: AssistantMessage = {
      id: randomUUID(),
      role: "assistant",
      text: "",
      thinking: "",
      streaming: true,
      error: null,
    }
    this.bubbles.set(itemId, message.id)
    this.thinkingAsked = false
    this.messages.push(message)
    // The first bubble of a run names what it is about to do.
    if (this.bubbles.size === 1) this.requestWorkingLabel(message.id)
    return message
  }

  private finishStreamingMessages(): void {
    for (const message of this.messages) {
      if (message.role === "assistant") message.streaming = false
      if (message.role === "tool") message.running = false
    }
    // Empty bubbles come from turns that only called tools.
    this.messages = this.messages.filter(
      (message) => message.role !== "assistant" || message.text || message.thinking || message.error,
    )
    this.bubbles.clear()
    this.streamed.clear()
  }

  // Names what the reply is thinking about, once enough thinking has streamed
  // to say something. One request per bubble; the label only lands while the
  // bubble still streams.
  private maybeDescribeThinking(bubble: AssistantMessage): void {
    if (this.thinkingAsked || bubble.thinkingLabel || bubble.thinking.length < 200) return
    this.thinkingAsked = true
    const id = bubble.id
    void (this.options.describeThinkingLabel?.(bubble.thinking) ?? Promise.resolve(null)).then((label) => {
      if (!label || this.disposed) return
      const current = this.messages.find((item) => item.id === id)
      if (current?.role !== "assistant" || !current.streaming || current.thinkingLabel) return
      current.thinkingLabel = label
      this.emit(false)
    })
  }

  // Names what the reply is about to do, from the latest user message, while
  // the reply has not produced anything yet.
  private requestWorkingLabel(id: string): void {
    const user = [...this.messages].reverse().find((item) => item.role === "user")
    if (!user || !user.text) return
    void (this.options.describeWorkingLabel?.(user.text) ?? Promise.resolve(null)).then((label) => {
      if (!label || this.disposed) return
      const bubble = this.messages.find((item) => item.id === id)
      if (bubble?.role !== "assistant" || !bubble.streaming || bubble.text || bubble.thinking) return
      bubble.workingLabel = label
      this.emit(false)
    })
  }

  private findTool(id: string): ToolMessage | null {
    const message = this.messages.find((item) => item.id === id)
    if (!message || message.role !== "tool") return null
    return message
  }

  private pushUser(request: PromptRequest, attachments: UserAttachment[]): UserMessage {
    const message: UserMessage = {
      id: randomUUID(),
      role: "user",
      text: request.text.trim(),
      attachments,
      comments: request.comments?.length ? request.comments : undefined,
      replies: request.replies?.length ? request.replies : undefined,
    }
    this.messages.push(message)
    this.markFirstMessage()
    void this.autoTitle()
    return message
  }

  // The first user message only flips the flag. The title itself comes from the
  // naming model, so a chat stays "New chat" until that model replies.
  private markFirstMessage(): void {
    if (this.named) return
    this.named = true
  }

  // Names the chat from the first user message, as soon as it is sent.
  private async autoTitle(): Promise<void> {
    if (this.titleGenerated) return
    this.titleGenerated = true
    const user = this.messages.find((message) => message.role === "user")
    if (!user || user.role !== "user" || !user.text) return
    try {
      const title = await this.options.generateTitle(user.text)
      if (!title || this.disposed) return
      this.options.onTitle(title, true)
    } catch {
      // The chat keeps its placeholder title.
    }
  }

  private enqueue(request: PromptRequest, mode: QueueMode): void {
    this.queue.push({ id: randomUUID(), mode, request })
    this.emit(false)
  }

  private async flushFollowUp(): Promise<void> {
    if (this.running) return
    const next = this.queue.find((item) => item.mode === "follow-up") ?? this.queue[0]
    if (!next) return
    this.queue = this.queue.filter((item) => item.id !== next.id)
    try {
      await this.send(next.request)
    } catch {
      // send shows the error.
    }
  }

  private setNotice(text: string | null, isError = false): void {
    this.notice = text
    this.noticeIsError = isError
  }

  private emit(runningChanged: boolean): void {
    if (this.disposed) return
    const running = this.running
    let changed = runningChanged
    if (running !== this.lastRunning) changed = true
    this.lastRunning = running
    this.options.onChange(changed)
  }
}

function isItem(params: unknown): params is { item: Item } {
  return typeof params === "object" && params !== null && "item" in params
}

function isDelta(params: unknown): params is ItemDeltaParams {
  return typeof params === "object" && params !== null && "itemId" in params && "delta" in params
}

function isTurnCompleted(params: unknown): params is TurnCompletedParams {
  return typeof params === "object" && params !== null && "terminal" in params
}

function isTurnUnqueued(params: unknown): params is TurnUnqueuedParams {
  return typeof params === "object" && params !== null && "turnId" in params && !("terminal" in params)
}

function isUserInput(params: unknown): params is UserInputRequestParams {
  return typeof params === "object" && params !== null && "userInputId" in params && "questions" in params
}

function isTokenUsage(params: unknown): params is SessionTokenUsageParams {
  return typeof params === "object" && params !== null && "cumulative" in params
}

function isSubscriptionUsage(params: unknown): params is SubscriptionUsage {
  return typeof params === "object" && params !== null && "tier" in params && "weekly" in params
}

// Maps the wire's subscription usage to the shared shape the settings show.
export function subscriptionUsage(usage: SubscriptionUsage): MuseSubscriptionUsage {
  return {
    tier: usage.tier,
    weekly: { usedPercent: usage.weekly.usedPercent, resetsAtMs: usage.weekly.resetsAtMs },
    window: {
      usedPercent: usage.window.usedPercent,
      resetsAtMs: usage.window.resetsAtMs,
      windowDurationMins: usage.window.windowDurationMins,
    },
    observedAtMs: usage.observedAtMs,
  }
}

// The subscription's last-observed usage windows, read from a short-lived
// host. Null until some turn has been observed on the user's install.
export async function museSubscriptionUsage(): Promise<MuseSubscriptionUsage | null> {
  const muse = findMuse()
  if (!muse) return null
  let connection: SpawnedMspConnection | null = null
  try {
    connection = await spawnMspConnection({
      command: muse,
      args: ["serve"],
      cwd: homedir(),
      env: museEnv(),
      onStderr: () => {},
    }).initialize({ clientInfo: MUSE_CLIENT })
    const result = await connection.connection.command("usage/read", {})
    return isSubscriptionUsage(result.usage) ? subscriptionUsage(result.usage) : null
  } catch {
    return null
  } finally {
    await connection?.close().catch(() => undefined)
  }
}

function isContextUsage(params: unknown): params is SessionContextUsageParams {
  return typeof params === "object" && params !== null && "usedTokens" in params
}

function isTodoList(params: unknown): params is SessionTodoListChangedParams {
  return typeof params === "object" && params !== null && "items" in params && "revision" in params
}

function isModelChanged(params: unknown): params is SessionModelChangedParams {
  return typeof params === "object" && params !== null && "modelId" in params && "source" in params
}

function isFailedStatus(status: string): boolean {
  return status !== "inProgress" && status !== "completed"
}

function museError(error: unknown): string {
  if (error instanceof MuseHostStartError) {
    const text = errorMessage(error)
    if (error.failure.kind === "spawnFailed" || /ENOENT|spawn/i.test(text))
      return "Muse Code isn't installed. Install it with `curl https://dev.meta.ai/install.sh | bash`, sign in with `muse`, then try again."
    if (error.failure.exit?.kind === "sdkSurfaceUnavailable")
      return "This Muse build has its SDK surface switched off. Update Muse Code, then try again."
    if (/login|auth|401/i.test(text)) return "Muse Code isn't signed in. Run `muse` in a terminal and sign in, then try again."
    return text
  }
  const text = errorMessage(error)
  if (/ENOENT|spawn/i.test(text))
    return "Muse Code isn't installed. Install it with `curl https://dev.meta.ai/install.sh | bash`, sign in with `muse`, then try again."
  if (/login|auth|401/i.test(text)) return "Muse Code isn't signed in. Run `muse` in a terminal and sign in, then try again."
  return text
}

function museExitNotice(exit: ExitClassification): string {
  if (exit.kind === "sdkSurfaceUnavailable") return "This Muse build has its SDK surface switched off. Update Muse Code, then try again."
  if (exit.kind === "unhandledError") return "Muse Code exited unexpectedly. The next message starts a new session."
  if (exit.kind === "crash") return "Muse Code crashed. The next message starts a new session."
  return "Muse Code stopped. The next message starts a new session."
}

// Apps opened from the Dock get a bare PATH, so the user's own install is
// looked for in the usual places. Without one the spawn fails and the chat
// explains the install.
function findMuse(): string | null {
  const home = homedir()
  const dirs = [
    ...(process.env.PATH ?? "").split(delimiter).filter(Boolean),
    join(home, ".local", "bin"),
    ...EXTRA_PATHS,
  ]
  for (const dir of dirs) {
    const file = join(dir, "muse")
    if (existsSync(file)) return file
  }
  return null
}

const EXTRA_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]

function museEnv(): Record<string, string | undefined> {
  const parts = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  for (const extra of [join(homedir(), ".local", "bin"), ...EXTRA_PATHS]) {
    if (!parts.includes(extra)) parts.push(extra)
  }
  return { ...process.env, PATH: parts.join(delimiter) }
}


