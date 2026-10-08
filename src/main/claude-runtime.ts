import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import {
  type CanUseTool,
  type PermissionResult,
  type Query,
  query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk"
import type {
  AssistantMessage,
  ChatMessage,
  EffortLevel,
  ModelOption,
  Personalisation,
  PromptRequest,
  QueueMode,
  QuestionReply,
  QuestionRequest,
  RewindMode,
  RewindResult,
  SlashCommand,
  TodoItem,
  ToolMessage,
  RuntimeTranscript,
  UsageState,
  UserAttachment,
  UserMessage,
} from "../shared/types"
import { CHAT_SYSTEM_PROMPT } from "./chat-prompt"
import { answered, parseQuestions } from "./extensions/ask-user"
import { personalisationPrompt } from "./extensions/personalisation"
import { errorMessage, formatValue, toolLabel, truncate } from "./format"
import { preparePrompt, type PreparedPrompt, queueDetail } from "./prompt"
import type { ClaudeModelUsage } from "./usage-ledger"

// Chats on these models run the user's own Claude Code install through the
// Agent SDK, so they sign in with whatever login Claude Code has: a Claude
// subscription or an API key.

export const CLAUDE_PREFIX = "claude-code/"

export const CLAUDE_MODELS: ModelOption[] = [
  { id: `${CLAUDE_PREFIX}opus`, name: "Claude Opus", contextWindow: 200_000, reasoning: true, provider: "claude-code" },
  { id: `${CLAUDE_PREFIX}sonnet`, name: "Claude Sonnet", contextWindow: 200_000, reasoning: true, provider: "claude-code" },
  { id: `${CLAUDE_PREFIX}haiku`, name: "Claude Haiku", contextWindow: 200_000, reasoning: true, provider: "claude-code" },
]

export function isClaudeModel(id: string | null | undefined): boolean {
  return Boolean(id?.startsWith(CLAUDE_PREFIX))
}

export function claudeModel(id: string | null | undefined): ModelOption | undefined {
  return CLAUDE_MODELS.find((model) => model.id === id)
}

const OUTPUT_LIMIT = 12_000
const APPROVED_PLAN =
  "The plan is approved. Carry it out now. Track the steps with the todo list: mark each item completed as soon as its work is done and mark the next one in_progress. Keep the list current through the end of every turn, and check the result at the end."
const PLAN_SUBMITTED = "The plan was shown to the user for review. End your turn now and wait for their reply."

// Claude Code's tool names, mapped to the names the transcript already draws.
const TOOL_NAMES: Record<string, string> = {
  Bash: "bash",
  Read: "read",
  Edit: "edit",
  MultiEdit: "edit",
  Write: "write",
  NotebookEdit: "edit",
  Grep: "grep",
  Glob: "find",
  LS: "ls",
  AskUserQuestion: "ask_user",
  TodoWrite: "todo",
  ExitPlanMode: "propose_plan",
  Task: "subagent",
  Agent: "subagent",
}

const EXTRA_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]

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

type ContentBlock = {
  type?: string
  id?: string
  name?: string
  input?: unknown
  text?: string
  thinking?: string
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
  source?: { type?: string; media_type?: string; data?: string }
}

export type ClaudeRuntimeOptions = {
  projectId: string
  chatId: string
  cwd: string
  mode?: "chat"
  sessionId: string | null
  modelId: string
  // Reasoning effort for Claude models, passed to the SDK as effortLevel.
  effort: EffortLevel
  named: boolean
  titleGenerated: boolean
  onChange: (runningChanged: boolean) => void
  onSession: (sessionId: string) => void
  onTitle: (title: string, generated: boolean) => void
  generateTitle: (user: string) => Promise<string | null>
  onModel: (modelId: string) => void
  onSettled: () => void
  onUsage: (usage: UsageState) => void
  // The running per-model total of each result, for the usage log's deltas.
  onModelUsage: (modelUsage: Record<string, ClaudeModelUsage>, costed: boolean) => void
  onQuestion: (request: QuestionRequest) => void
  // Keeps a proposed plan across restarts, so a crash shows it again.
  planProposal?: string | null
  onPlanProposal: (plan: string | null) => void
  saveBytes: (name: string, mimeType: string, bytes: Buffer) => Promise<SavedFile>
  // Global personalisation, re-read on every run so edits apply from the next message.
  personalisation: () => Personalisation
}

export class ClaudeRuntime {
  readonly projectId: string
  readonly chatId: string
  readonly provider = "claude-code" as const
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
  // Claude Code writes its plan to a markdown file and calls ExitPlanMode with no plan text.
  private planFile: string | null = null
  private question: OpenQuestion | null = null
  private named: boolean
  private titleGenerated: boolean
  private sessionId: string | null
  private session: Query | null = null
  private input: InputQueue | null = null
  // Personalisation fragment the live process was created with.
  private sessionPersonalisation: string | null = null
  private abortController: AbortController | null = null
  private slashCommands: SlashCommand[] = []
  private subscription = false
  private lastContextTokens: number | null = null
  // Claude Code splits one API message into a frame per block, so replies
  // are matched to their bubble by the API message id.
  private bubbles = new Map<string, string>()
  private streamed = new Set<string>()
  private lastRunning = false
  private disposed = false
  private effort: EffortLevel
  private pendingEffort: EffortLevel | null = null
  private readonly options: ClaudeRuntimeOptions

  constructor(options: ClaudeRuntimeOptions) {
    this.options = options
    this.projectId = options.projectId
    this.chatId = options.chatId
    this.planProposal = options.planProposal ?? null
    this.modelId = options.modelId
    this.modelName = claudeModel(options.modelId)?.name ?? options.modelId
    this.effort = options.effort
    this.named = options.named
    this.titleGenerated = options.titleGenerated
    this.sessionId = options.sessionId
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

  // The Claude Code process starts with the first message, not when the chat opens.
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
    // Claude Code folds a message sent mid-turn into the running turn.
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
      await session.interrupt()
    } catch {
      this.abortController?.abort()
    }
  }

  async setModel(modelId: string): Promise<boolean> {
    const model = claudeModel(modelId)
    if (!model) throw new Error("That model is not available.")
    if (this.running) throw new Error("Wait for the run to finish.")
    if (this.session) await this.session.setModel(sdkModel(model.id))
    this.modelId = model.id
    this.modelName = model.name
    this.options.onModel(model.id)
    this.emit(false)
    return true
  }

  // The flag layer applies between turns. While a run streams, hold the level
  // until the next turn starts, where ensureSession applies it.
  setEffort(effort: EffortLevel): void {
    if (this.running) {
      this.pendingEffort = effort
      return
    }
    void this.applyEffort(effort)
  }

  private async applyEffort(effort: EffortLevel): Promise<void> {
    this.effort = effort
    if (!this.session) return
    try {
      await this.session.applyFlagSettings({ effortLevel: claudeEffort(effort) })
    } catch {
      // The next session creation passes the level as a query option.
    }
  }

  setPlanMode(enabled: boolean): void {
    if (this.running) throw new Error("Wait for the run to finish.")
    this.planEnabled = enabled
    if (!enabled) {
      this.setProposal(null)
      this.planFile = null
    }
    void this.session?.setPermissionMode(enabled ? "plan" : "default").catch(() => undefined)
    this.emit(true)
  }

  async approvePlan(): Promise<void> {
    if (!this.planProposal) throw new Error("There is no plan to approve.")
    this.setPlanMode(false)
    await this.prompt({ text: APPROVED_PLAN, mentions: [], files: [] })
  }

  answerQuestion(id: string, reply: QuestionReply): void {
    if (!this.question || this.question.request.id !== id) throw new Error("That question was already answered.")
    this.settleQuestion(reply)
  }

  async compact(): Promise<void> {
    if (this.running) throw new Error("Wait for the run to finish.")
    await this.send({ text: "/compact", mentions: [], files: [] })
  }

  async editMessage(_id: string, _text: string): Promise<void> {
    throw new Error("Editing sent messages isn't available in Claude Code chats yet.")
  }

  async rewind(_id: string, _mode: RewindMode): Promise<RewindResult> {
    throw new Error("Rewind isn't available in Claude Code chats yet.")
  }

  async undoRewind(_commit: string): Promise<void> {
    throw new Error("Rewind isn't available in Claude Code chats yet.")
  }

  async turnDiff(): Promise<string> {
    return ""
  }

  taskOutput(_id: string): string {
    return ""
  }

  stopTask(_id: string): void {}

  dispose(): void {
    this.disposed = true
    this.settleQuestion(null)
    this.input?.close()
    this.abortController?.abort()
    this.session = null
    this.input = null
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
    if (pendingEffort) await this.applyEffort(pendingEffort)
    // Todo lists belong to the turn that created them; drop the previous
    // turn's list so a finished list doesn't linger over the new ask.
    this.todos = []
    this.emit(true)
    try {
      await this.push(request)
    } catch (error) {
      this.sending = false
      this.setNotice(errorMessage(error), true)
      this.emit(true)
      throw error
    }
  }

  private async push(request: PromptRequest): Promise<void> {
    const prepared = await preparePrompt(request, this.options.saveBytes)
    this.pushUser(request, prepared.attachments)
    this.emit(false)
    this.ensureSession().push(userMessage(prepared))
  }

  // One Claude Code process per chat, fed through a queue so follow-ups and
  // mid-turn messages reach the same session.
  private ensureSession(): InputQueue {
    const append = personalisationPrompt(this.options.personalisation())
    if (this.input && this.session && !this.streaming && this.sessionPersonalisation !== append) {
      // The recorded system prompt would ignore a changed append on resume, so
      // start a fresh process; resume keeps the conversation. Happens only
      // between turns, when the queue is empty.
      this.input?.close()
      this.abortController?.abort()
      this.session = null
      this.input = null
    }
    if (this.input && this.session) return this.input
    const input = new InputQueue()
    const abortController = new AbortController()
    const executable = findClaude()
    const session = query({
      prompt: input,
      options: {
        cwd: this.options.cwd,
        model: sdkModel(this.modelId),
        effort: claudeEffort(this.effort),
        resume: this.sessionId ?? undefined,
        abortController,
        includePartialMessages: true,
        permissionMode: this.planEnabled ? "plan" : "default",
        canUseTool: this.canUseTool,
        // Render fresh on every request, so a recreated process picks up the
        // current personalisation even though the conversation resumes. Chat
        // projects replace the coding preset with the conversational prompt;
        // a plain string replaces the preset outright.
        systemPrompt: this.options.mode === "chat"
          ? CHAT_SYSTEM_PROMPT + (append ? `\n\n${append}` : "")
          : { type: "preset", preset: "claude_code", append: append ?? undefined, snapshot: false },
        settingSources: ["user", "project", "local"],
        env: claudeEnv(),
        ...(executable ? { pathToClaudeCodeExecutable: executable } : {}),
      },
    })
    this.input = input
    this.session = session
    this.sessionPersonalisation = append
    this.abortController = abortController
    void this.consume(session)
    return input
  }

  private async consume(session: Query): Promise<void> {
    try {
      for await (const message of session) {
        if (this.session !== session) return
        this.onMessage(message)
      }
    } catch (error) {
      if (this.session !== session || this.disposed) return
      this.setNotice(claudeError(error), true)
    }
    if (this.session !== session || this.disposed) return
    // The process ended, so the next message starts a fresh one that resumes.
    this.session = null
    this.input = null
    if (this.running) {
      this.streaming = false
      this.sending = false
      this.finishStreamingMessages()
      this.emit(true)
      this.options.onSettled()
    }
  }

  private canUseTool: CanUseTool = async (toolName, input, options): Promise<PermissionResult> => {
    if (toolName === "AskUserQuestion") return this.ask(input, options.toolUseID, options.signal)
    if (toolName === "ExitPlanMode") {
      this.setProposal(this.readPlan(input) || "Claude proposed a plan.")
      this.emit(true)
      return { behavior: "deny", message: PLAN_SUBMITTED }
    }
    return { behavior: "allow", updatedInput: input }
  }

  private readPlan(input: Record<string, unknown>): string {
    if (typeof input.plan === "string" && input.plan.trim()) return input.plan.trim()
    const file = typeof input.planFilePath === "string" ? input.planFilePath : this.planFile
    if (!file) return ""
    try {
      return readFileSync(file, "utf8").trim()
    } catch {
      return ""
    }
  }

  private async ask(input: Record<string, unknown>, toolUseId: string, signal: AbortSignal): Promise<PermissionResult> {
    const questions = parseQuestions(input as Parameters<typeof parseQuestions>[0])
    if (questions.length === 0) return { behavior: "deny", message: "Send at least one question with two options." }
    this.settleQuestion(null)
    const request: QuestionRequest = { id: toolUseId, questions }
    const reply = await new Promise<QuestionReply | null>((resolve) => {
      this.question = { request, resolve }
      this.emit(true)
      this.options.onQuestion(request)
      signal.addEventListener("abort", () => this.settleQuestion(null), { once: true })
    })
    const tool = this.findTool(toolUseId)
    if (tool) tool.answers = answered(questions, reply)
    this.emit(false)
    if (!reply) return { behavior: "deny", message: "The question was cancelled before the user answered." }
    if (reply.skipped) {
      if (!reply.message) return { behavior: "deny", message: "The user skipped the questions." }
      return { behavior: "deny", message: `The user answered in their own words: ${reply.message}` }
    }
    const answers: Record<string, string> = {}
    const annotations: Record<string, { notes?: string }> = {}
    for (const question of questions) {
      const answer = reply.answers.find((item) => item.questionId === question.id)
      if (!answer) continue
      const picked = [...answer.selected]
      if (answer.other) picked.push(answer.other)
      if (picked.length > 0) answers[question.question] = picked.join(", ")
      if (answer.note) annotations[question.question] = { notes: answer.note }
    }
    return { behavior: "allow", updatedInput: { ...input, answers, annotations } }
  }

  private settleQuestion(reply: QuestionReply | null): void {
    const open = this.question
    if (!open) return
    this.question = null
    open.resolve(reply)
    this.emit(true)
  }

  private onMessage(message: SDKMessage): void {
    if (message.type === "system" && message.subtype === "init") {
      this.subscription = message.apiKeySource === "none"
      if (message.session_id && message.session_id !== this.sessionId) {
        this.sessionId = message.session_id
        this.options.onSession(message.session_id)
      }
      void this.loadCommands()
      return
    }

    if (message.type === "system" && message.subtype === "status") {
      if (message.status === "compacting") this.setNotice("Summarizing earlier messages")
      else if (this.notice === "Summarizing earlier messages") this.setNotice(null)
      this.emit(false)
      return
    }

    if (message.type === "system" && message.subtype === "api_retry") {
      this.setNotice(`Retrying ${message.attempt} of ${message.max_retries}`)
      this.emit(false)
      return
    }

    // Subagent frames stay inside their Task tool.
    if ("parent_tool_use_id" in message && message.parent_tool_use_id) return

    if (message.type === "stream_event") {
      this.onStreamEvent(message.event as StreamEvent)
      return
    }

    if (message.type === "assistant") {
      this.onAssistant(message.message as unknown as ApiMessage, message.error)
      return
    }

    if (message.type === "user") {
      this.onToolResults(message.message.content)
      return
    }

    if (message.type === "result") {
      this.onResult(message)
    }
  }

  private onStreamEvent(event: StreamEvent): void {
    if (event.type === "message_start") {
      this.startTurn()
      const id = event.message?.id
      if (id) this.bubbleFor(id)
      this.emit(false)
      return
    }
    if (event.type !== "content_block_delta" || !event.delta) return
    const id = this.currentStreamId
    if (!id) return
    const bubble = this.bubbleFor(id)
    this.streamed.add(id)
    if (event.delta.type === "text_delta" && event.delta.text) bubble.text += event.delta.text
    if (event.delta.type === "thinking_delta" && event.delta.thinking) bubble.thinking += event.delta.thinking
    this.emit(false)
  }

  private currentStreamId: string | null = null

  private onAssistant(api: ApiMessage, error: unknown): void {
    this.startTurn()
    const streamed = this.streamed.has(api.id)
    for (const block of api.content ?? []) {
      if (!streamed && block.type === "text" && block.text) this.bubbleFor(api.id).text += block.text
      if (!streamed && block.type === "thinking" && block.thinking) this.bubbleFor(api.id).thinking += block.thinking
      if (block.type === "tool_use" && block.id) this.startTool(block)
    }
    if (error) this.bubbleFor(api.id).error = typeof error === "string" ? error : "Claude Code reported an error."
    const usage = api.usage
    if (usage) {
      this.lastContextTokens =
        (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)
    }
    this.emit(false)
  }

  private startTool(block: ContentBlock): void {
    if (!block.id || this.findTool(block.id)) return
    const rawName = block.name ?? "tool"
    const name = TOOL_NAMES[rawName] ?? rawName
    if (rawName === "TodoWrite") this.todos = todoItems(block.input)
    const filePath = (block.input as { file_path?: unknown } | undefined)?.file_path
    if (this.planEnabled && (rawName === "Write" || rawName === "Edit") && typeof filePath === "string" && filePath.endsWith(".md")) {
      this.planFile = filePath
    }
    const tool: ToolMessage = {
      id: block.id,
      role: "tool",
      name,
      label: toolLabel(name, block.input),
      args: formatValue(block.input),
      output: "",
      images: [],
      running: true,
      isError: false,
    }
    this.messages.push(tool)
    // Text after a tool call belongs in a new bubble below it.
    this.bubbles.clear()
  }

  private onToolResults(content: unknown): void {
    if (!Array.isArray(content)) return
    for (const block of content as ContentBlock[]) {
      if (block.type !== "tool_result" || !block.tool_use_id) continue
      const tool = this.findTool(block.tool_use_id)
      if (!tool) continue
      const { text, images } = resultParts(block.content)
      tool.output = truncate(text, OUTPUT_LIMIT)
      tool.running = false
      tool.isError = Boolean(block.is_error) && tool.name !== "propose_plan"
      if (tool.name === "propose_plan") tool.output = ""
      if (images.length > 0) void this.attachImages(tool, images)
    }
    this.emit(false)
  }

  private onResult(message: Extract<SDKMessage, { type: "result" }>): void {
    this.readUsage(message)
    try {
      // A subscription isn't billed per token, so its cost estimate is not a cost.
      this.options.onModelUsage(message.modelUsage ?? {}, !this.subscription)
    } catch (error) {
      console.error("usage record:", error)
    }
    if (message.is_error) {
      const detail = "errors" in message && message.errors?.length ? message.errors.join("\n") : null
      const text = detail ?? ("result" in message && message.result ? message.result : "Claude Code stopped with an error.")
      this.setNotice(text, true)
    } else if (this.notice && !this.noticeIsError) {
      this.setNotice(null)
    }
    if ((message.queued_turn_count ?? 0) > 0) {
      this.emit(false)
      return
    }
    this.streaming = false
    this.sending = false
    this.finishStreamingMessages()
    this.emit(true)
    this.options.onSettled()
    queueMicrotask(() => void this.flushFollowUp())
  }

  private readUsage(message: Extract<SDKMessage, { type: "result" }>): void {
    let input = 0
    let output = 0
    let cache = 0
    let contextWindow = claudeModel(this.modelId)?.contextWindow ?? 200_000
    for (const usage of Object.values(message.modelUsage ?? {})) {
      input += usage.inputTokens
      output += usage.outputTokens
      cache += usage.cacheReadInputTokens + usage.cacheCreationInputTokens
      if (usage.contextWindow) contextWindow = usage.contextWindow
    }
    const contextTokens = this.lastContextTokens
    this.usageState = {
      contextTokens,
      contextWindow,
      percent: contextTokens === null ? null : Math.min(100, (contextTokens / contextWindow) * 100),
      inputTokens: input,
      outputTokens: output,
      cacheTokens: cache,
      totalTokens: input + output + cache,
      // A subscription isn't billed per token, so its estimate isn't a cost.
      cost: this.subscription ? 0 : message.total_cost_usd,
    }
    this.options.onUsage(this.usageState)
  }

  private async loadCommands(): Promise<void> {
    try {
      const commands = (await this.session?.supportedCommands()) ?? []
      this.slashCommands = commands.map((command) => ({
        name: command.name,
        insert: `/${command.name} `,
        description: command.description,
        kind: "command",
      }))
    } catch {
      // The composer keeps working without suggestions.
    }
  }

  private startTurn(): void {
    if (this.streaming) return
    this.streaming = true
    this.sending = false
    this.emit(true)
  }

  private bubbleFor(apiId: string): AssistantMessage {
    this.currentStreamId = apiId
    const existingId = this.bubbles.get(apiId)
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
    this.bubbles.set(apiId, message.id)
    this.messages.push(message)
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
    this.currentStreamId = null
  }

  private findTool(id: string): ToolMessage | null {
    const message = this.messages.find((item) => item.id === id)
    if (!message || message.role !== "tool") return null
    return message
  }

  private async attachImages(tool: ToolMessage, images: { data: string; mimeType: string }[]): Promise<void> {
    const urls: string[] = []
    for (const image of images) {
      const saved = await this.options.saveBytes("snapshot.png", image.mimeType, Buffer.from(image.data, "base64"))
      urls.push(saved.url)
    }
    tool.images = urls
    this.emit(false)
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

type ApiUsage = {
  input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

type ApiMessage = {
  id: string
  content?: ContentBlock[]
  usage?: ApiUsage
}

type StreamEvent = {
  type: string
  message?: { id?: string }
  delta?: { type?: string; text?: string; thinking?: string }
}

// A push-fed prompt stream: Claude Code reads each message as it arrives and
// the process stays up until the stream closes.
class InputQueue implements AsyncIterable<SDKUserMessage> {
  private items: SDKUserMessage[] = []
  private waiters: ((result: IteratorResult<SDKUserMessage>) => void)[] = []
  private closed = false

  push(item: SDKUserMessage): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter) waiter({ value: item, done: false })
    else this.items.push(item)
  }

  close(): void {
    this.closed = true
    for (const waiter of this.waiters) waiter({ value: undefined, done: true })
    this.waiters = []
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: () => {
        const item = this.items.shift()
        if (item) return Promise.resolve({ value: item, done: false })
        if (this.closed) return Promise.resolve({ value: undefined, done: true })
        return new Promise((resolve) => this.waiters.push(resolve))
      },
    }
  }
}

function sdkModel(modelId: string): string {
  return modelId.startsWith(CLAUDE_PREFIX) ? modelId.slice(CLAUDE_PREFIX.length) : modelId
}

// The SDK has no minimal level; the closest is low.
function claudeEffort(effort: EffortLevel): "low" | "medium" | "high" | "xhigh" | "max" {
  return effort === "minimal" ? "low" : effort
}

function userMessage(prepared: PreparedPrompt): SDKUserMessage {
  const content: unknown[] = prepared.images.map((image) => ({
    type: "image",
    source: { type: "base64", media_type: image.mimeType, data: image.data },
  }))
  content.push({ type: "text", text: prepared.text })
  return {
    type: "user",
    message: { role: "user", content: content as SDKUserMessage["message"]["content"] },
    parent_tool_use_id: null,
  } as SDKUserMessage
}

function resultParts(content: unknown): { text: string; images: { data: string; mimeType: string }[] } {
  if (typeof content === "string") return { text: content, images: [] }
  if (!Array.isArray(content)) return { text: "", images: [] }
  const text: string[] = []
  const images: { data: string; mimeType: string }[] = []
  for (const block of content as ContentBlock[]) {
    if (block.type === "text" && block.text) text.push(block.text)
    if (block.type === "image" && block.source?.data && block.source.media_type) {
      images.push({ data: block.source.data, mimeType: block.source.media_type })
    }
  }
  return { text: text.join("\n"), images }
}

function todoItems(input: unknown): TodoItem[] {
  const todos = (input as { todos?: unknown } | null)?.todos
  if (!Array.isArray(todos)) return []
  const items: TodoItem[] = []
  for (const todo of todos as { content?: unknown; status?: unknown }[]) {
    if (typeof todo?.content !== "string") continue
    const status = todo.status === "in_progress" || todo.status === "completed" ? todo.status : "pending"
    items.push({ text: todo.content, status })
  }
  return items
}

function claudeError(error: unknown): string {
  const text = errorMessage(error)
  if (/ENOENT|spawn/i.test(text)) return "Claude Code isn't installed. Install it and sign in with `claude`, then try again."
  if (/login|auth|401/i.test(text)) return "Claude Code isn't signed in. Run `claude` in a terminal and sign in, then try again."
  return text
}

// Apps opened from the Dock get a bare PATH, so the user's own install is
// looked for in the usual places. Without one the SDK's bundled copy runs.
function findClaude(): string | null {
  const home = homedir()
  const dirs = [
    ...(process.env.PATH ?? "").split(delimiter).filter(Boolean),
    join(home, ".local", "bin"),
    join(home, ".claude", "local"),
    ...EXTRA_PATHS,
  ]
  for (const dir of dirs) {
    const file = join(dir, "claude")
    if (existsSync(file)) return file
  }
  return null
}

function claudeEnv(): Record<string, string | undefined> {
  const parts = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  for (const extra of [join(homedir(), ".local", "bin"), ...EXTRA_PATHS]) {
    if (!parts.includes(extra)) parts.push(extra)
  }
  return { ...process.env, PATH: parts.join(delimiter) }
}
