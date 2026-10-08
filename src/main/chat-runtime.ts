import { randomUUID } from "node:crypto"
import { mkdir, readFile, stat } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, dirname, extname, join, resolve } from "node:path"
import {
  type AgentSession,
  type AgentSessionEvent,
  createAgentSession,
  createMcpExtension,
  DefaultResourceLoader,
  type ExtensionFactory,
  getAgentDir,
  type InlineExtension,
  type McpServerConfig,
  type ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent"
import type { ImageContent } from "@earendil-works/pi-ai"
import type {
  AssistantMessage,
  ChatMessage,
  ChatMention,
  ExtensionInfo,
  Personalisation,
  QueueMode,
  PromptRequest,
  QuestionReply,
  QuestionRequest,
  TaskInfo,
  RewindMode,
  RewindResult,
  TodoItem,
  SlashCommand,
  ToolMessage,
  RuntimeTranscript,
  UserAttachment,
  UsageState,
  UserMessage,
} from "../shared/types"
import { sessionCommands } from "./commands"
import { COMPUTER_TOOL_NAMES, computerTools } from "./computer-tools"
import type { ComputerGate } from "./computer-gate"
import type { ComputerUse } from "./computer"
import { assistantParts, errorMessage, formatValue, toolLabel, toolResultImages, toolResultText } from "./format"
import { CheckpointStore } from "./checkpoints"
import { checkpointBefore, checkpointExtension } from "./extensions/checkpoints"
import { type BackgroundTasks, backgroundTasks } from "./extensions/background-tasks"
import { focusGuard } from "./extensions/focus-guard"
import { discoverAgents, subagentExtension } from "./extensions/subagents"
import { ASK_USER, askUser, type AskUserDetails } from "./extensions/ask-user"
import { personalisationExtension } from "./extensions/personalisation"
import { planMode, type PlanModeControl } from "./extensions/plan-mode"
import { todoExtension } from "./extensions/todo"
import { chatHistoryExtension } from "./extensions/chat-history"
import { preparePrompt, queueDetail } from "./prompt"
import type { Library } from "./library"

// Pi treats the tools list as an allowlist, so tools from slagent's own
// extensions are named here too.
const CODING_TOOLS = [
  "read",
  "bash",
  "edit",
  "write",
  "grep",
  "find",
  "ls",
  "todo",
  "search_chats",
  "read_chat",
  "propose_plan",
  "ask_user",
  "bash_background",
  "task_output",
  "task_stop",
  "subagent",
]
const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
}
const IMAGE_LIMIT = 20 * 1024 * 1024
const APPROVED_PLAN =
  "The plan is approved. Carry it out now. Track the steps with the todo tool: mark each item completed as soon as its work is done and mark the next one in_progress. Keep the list current through the end of every turn, and check the result at the end."

export type AgentModel = NonNullable<ReturnType<ModelRuntime["getModel"]>>

type Pending = {
  id: string
  mode: QueueMode
  request: PromptRequest
}

type SavedFile = {
  url: string
  path: string
}

export type ChatRuntimeOptions = {
  projectId: string
  chatId: string
  cwd: string
  sessionDir: string
  checkpointDir: string
  sessionFile: string | null
  model: AgentModel
  named: boolean
  titleGenerated: boolean
  computer: ComputerUse
  gate: ComputerGate
  modelRuntime: ModelRuntime
  // Servers slagent manages, registered with Pi's MCP extension for this session.
  mcpServers?: Record<string, McpServerConfig>
  // Past-chat search and reads, shared with the renderer.
  library: Library
  // Global personalisation, re-read on every run so edits apply from the next message.
  personalisation: () => Personalisation
  onChange: (runningChanged: boolean) => void
  onExtensions: (extensions: ExtensionInfo[], errors: string[]) => void
  onTitle: (title: string, generated: boolean) => void
  generateTitle: (user: string, assistant: string) => Promise<string | null>
  onModel: (modelId: string) => void
  onSettled: () => void
  onUsage: (usage: UsageState) => void
  onTaskFinished: (task: TaskInfo) => void
  onQuestion: (request: QuestionRequest) => void
  // Keeps a proposed plan across restarts, so a crash shows it again.
  planProposal?: string | null
  onPlanProposal: (plan: string | null) => void
  saveBytes: (name: string, mimeType: string, bytes: Buffer) => Promise<SavedFile>
}

// Registers slagent's managed MCP servers with Pi's MCP extension. Servers
// registered during load are connected on session_start.
function mcpServersExtension(servers: Record<string, McpServerConfig>): ExtensionFactory {
  return (pi) => {
    for (const [name, config] of Object.entries(servers)) {
      try {
        pi.registerMcpServer(name, config)
      } catch (error) {
        console.error(`mcp: could not register ${name}:`, error)
      }
    }
  }
}

export class ChatRuntime {
  readonly projectId: string
  readonly chatId: string
  modelId: string
  modelName: string
  messages: ChatMessage[] = []
  private queue: Pending[] = []
  private streaming = false
  private sending = false
  private notice: string | null = null
  private noticeIsError = false
  private awaiting = false
  private usageState: UsageState | null = null
  private todos: TodoItem[] = []
  private checkpoints: CheckpointStore
  private tasks: BackgroundTasks
  private taskList: TaskInfo[] = []
  private planEnabled = false
  private planProposal: string | null
  private readonly plan: PlanModeControl = planMode({
    onEnabled: (enabled) => {
      this.planEnabled = enabled
      if (!enabled) this.clearProposal()
      this.emit(true)
    },
    onProposal: (plan) => {
      this.planProposal = plan
      this.awaiting = true
      this.options.onPlanProposal(plan)
      this.emit(true)
    },
    readOnlyAgents: () => {
      const names = discoverAgents(this.options.cwd)
        .filter((agent) => agent.readOnly)
        .map((agent) => agent.name)
      return new Set(names)
    },
  })
  private readonly questions = askUser({
    resolveImage: (image) => this.resolveImage(image),
    onAsk: (request) => {
      this.emit(true)
      this.options.onQuestion(request)
    },
    onDone: () => this.emit(true),
  })
  // Transcript user messages waiting for Pi to persist them, oldest first.
  private pendingUserIds: string[] = []
  private named: boolean
  private titleGenerated: boolean
  private session: AgentSession | null = null
  private unsubscribe: (() => void) | null = null
  private sessionToken: object | null = null
  private currentAssistantId: string | null = null
  private pendingModel: AgentModel | null = null
  private lastRunning = false
  private readonly options: ChatRuntimeOptions

  constructor(options: ChatRuntimeOptions) {
    this.options = options
    this.projectId = options.projectId
    this.chatId = options.chatId
    this.modelId = options.model.id
    this.modelName = options.model.name
    this.named = options.named
    this.titleGenerated = options.titleGenerated
    this.planProposal = options.planProposal ?? null
    this.awaiting = this.planProposal !== null
    this.checkpoints = new CheckpointStore(options.cwd, options.checkpointDir)
    this.tasks = backgroundTasks(options.cwd, (tasks, finished) => {
      this.taskList = tasks
      this.emit(false)
      if (finished && finished.status !== "stopped") this.options.onTaskFinished(finished)
    })
  }

  taskOutput(id: string): string {
    return this.tasks.output(id)
  }

  stopTask(id: string): void {
    this.tasks.stop(id)
  }

  get runningTasks(): number {
    return this.taskList.filter((task) => task.status === "running").length
  }

  get key(): string {
    return `${this.projectId}:${this.chatId}`
  }

  get running(): boolean {
    return this.streaming || this.sending
  }

  // Set by features that pause a run for the user, such as plan approval.
  get waiting(): boolean {
    return this.awaiting || this.questions.pending() !== null
  }

  get failed(): boolean {
    if (this.running) return false
    if (this.notice) return this.noticeIsError
    const last = this.messages[this.messages.length - 1]
    return last?.role === "assistant" && Boolean(last.error)
  }

  load(messages: ChatMessage[]): void {
    this.messages = messages.map(normalizeMessage)
  }

  lockTitle(): void {
    this.named = true
    this.titleGenerated = true
  }

  transcript(): RuntimeTranscript {
    return {
      messages: this.messages,
      // Includes the time before Pi starts the run, while the prompt is prepared
      // and the checkpoint taken, so the UI shows activity right away.
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
      question: this.questions.pending(),
      tasks: this.taskList,
    }
  }

  // Stats walk every session entry, so they refresh at message boundaries
  // rather than on each streamed delta.
  private refreshUsage(): void {
    this.usageState = this.readUsage()
    if (this.usageState) this.options.onUsage(this.usageState)
  }

  private readUsage(): UsageState | null {
    const session = this.session
    if (!session) return null
    try {
      const stats = session.getSessionStats()
      const context = session.getContextUsage()
      return {
        contextTokens: context?.tokens ?? null,
        contextWindow: context?.contextWindow ?? session.model?.contextWindow ?? 0,
        percent: context?.percent ?? null,
        inputTokens: stats.tokens.input,
        outputTokens: stats.tokens.output,
        cacheTokens: stats.tokens.cacheRead + stats.tokens.cacheWrite,
        totalTokens: stats.tokens.total,
        cost: stats.cost,
      }
    } catch {
      return null
    }
  }

  async compact(): Promise<void> {
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    if (this.running || session.isStreaming) throw new Error("Wait for the run to finish.")
    this.setNotice("Summarizing earlier messages")
    this.emit(false)
    try {
      await session.compact()
      this.setNotice(null)
      this.refreshUsage()
    } catch (error) {
      this.setNotice(errorMessage(error), true)
    }
    this.emit(false)
  }

  async open(): Promise<string | null> {
    await mkdir(this.options.sessionDir, { recursive: true })
    const sessionManager = this.sessionManager()
    let toolNames = CODING_TOOLS
    let customTools: ReturnType<typeof computerTools> = []
    // Tool-providing extensions are replaceable: a Pi package that registers a
    // tool with the same name, such as pi-subagents, is used instead.
    const extensionFactories: InlineExtension[] = [
      { name: "slagent-checkpoints", factory: checkpointExtension(this.checkpoints), hidden: true },
      { name: "slagent-background-tasks", factory: this.tasks.extension, hidden: true, replaceable: true },
      {
        name: "slagent-subagents",
        hidden: true,
        replaceable: true,
        factory: subagentExtension({
          cwd: this.options.cwd,
          modelRuntime: this.options.modelRuntime,
          model: () => (this.session?.model as AgentModel | undefined) ?? this.options.model,
        }),
      },
      { name: "slagent-personalisation", hidden: true, factory: personalisationExtension(this.options.personalisation) },
      { name: "slagent-plan-mode", factory: this.plan.extension, hidden: true, replaceable: true },
      { name: "slagent-ask-user", factory: this.questions.extension, hidden: true, replaceable: true },
      {
        name: "slagent-todo",
        hidden: true,
        replaceable: true,
        factory: todoExtension((todos) => {
          this.todos = todos
          this.emit(false)
        }),
      },
      {
        name: "slagent-chat-history",
        hidden: true,
        replaceable: true,
        factory: chatHistoryExtension({ library: this.options.library, currentProjectId: () => this.projectId }),
      },
      { name: "slagent-mcp-servers", hidden: true, factory: mcpServersExtension(this.options.mcpServers ?? {}) },
      { name: "slagent-mcp", hidden: true, factory: createMcpExtension() },
    ]
    if (process.platform === "darwin") {
      toolNames = [...CODING_TOOLS, ...COMPUTER_TOOL_NAMES]
      customTools = computerTools(this.options.computer, this.options.gate)
      extensionFactories.push(focusGuard)
    }

    const agentDir = getAgentDir()
    const settingsManager = SettingsManager.create(this.options.cwd, agentDir)
    const resourceLoader = new DefaultResourceLoader({
      cwd: this.options.cwd,
      agentDir,
      settingsManager,
      extensionFactories,
    })
    await resourceLoader.reload()

    const { session, extensionsResult } = await createAgentSession({
      cwd: this.options.cwd,
      modelRuntime: this.options.modelRuntime,
      model: this.options.model,
      tools: toolNames,
      customTools,
      sessionManager,
      settingsManager,
      resourceLoader,
    })

    this.session = session
    this.refreshUsage()
    this.rememberExtensions(extensionsResult)
    const token = {}
    this.sessionToken = token
    this.unsubscribe = session.subscribe((event) => {
      if (this.sessionToken !== token) return
      this.onEvent(event)
    })

    try {
      await session.bindExtensions({
        mode: "print",
        onError: (extensionError) => {
          const name = basename(extensionError.extensionPath)
          this.extensionErrors = [...this.extensionErrors, `${name}: ${extensionError.error}`].slice(-20)
          this.options.onExtensions(this.extensions, this.extensionErrors)
        },
        commandContextActions: {
          waitForIdle: () => session.waitForIdle(),
          newSession: async () => ({ cancelled: true }),
          fork: async () => ({ cancelled: true }),
          navigateTree: async () => ({ cancelled: true }),
          switchSession: async () => ({ cancelled: true }),
          reload: async () => {
            await session.reload()
          },
        },
      })
    } catch (error) {
      this.extensionErrors = [...this.extensionErrors, errorMessage(error)].slice(-20)
      this.options.onExtensions(this.extensions, this.extensionErrors)
    }

    return session.sessionManager.getSessionFile() ?? null
  }

  private extensions: ExtensionInfo[] = []
  private extensionErrors: string[] = []
  private disposed = false

  async prompt(request: PromptRequest): Promise<void> {
    if (!this.session) throw new Error("The session is not ready.")
    // A message sent while a question is open answers it in the user's own
    // words, so the run carries on instead of the message waiting in the queue.
    const question = this.questions.pending()
    if (question && request.text.trim() && request.files.length === 0) {
      this.answerQuestion(question.id, { skipped: true, message: request.text.trim() })
      return
    }
    if (this.streaming || this.sending || this.session.isStreaming) {
      this.enqueue(request, "follow-up")
      return
    }
    this.sending = true
    this.emit(true)
    try {
      await this.send(request)
    } finally {
      this.sending = false
      this.emit(true)
      this.scheduleFlush()
    }
  }

  async setQueueMode(id: string, mode: QueueMode): Promise<void> {
    const index = this.queue.findIndex((item) => item.id === id)
    const item = this.queue[index]
    if (!item) return
    if (mode === "follow-up") {
      item.mode = "follow-up"
      this.emit(false)
      return
    }
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    if (session.isStreaming || this.streaming) {
      this.queue.splice(index, 1)
      const prepared = await preparePrompt(item.request, this.options.saveBytes, this.readChat)
      this.pushUser(item.request, prepared.attachments)
      this.emit(false)
      await session.steer(prepared.text, promptImages(prepared.images))
      return
    }
    if (this.sending) {
      item.mode = "steer"
      this.emit(false)
      return
    }
    this.queue.splice(index, 1)
    this.emit(false)
    await this.prompt(item.request)
  }

  commands(): SlashCommand[] {
    if (!this.session) return []
    return sessionCommands(this.session)
  }

  // Code goes back to the snapshot taken before the message. The chat goes
  // back to just before it, and its text is returned for the composer.
  async rewind(id: string, mode: RewindMode): Promise<RewindResult> {
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    if (this.running || session.isStreaming) throw new Error("Stop the run before rewinding.")
    const index = this.messages.findIndex((message) => message.id === id)
    const message = this.messages[index]
    if (!message || message.role !== "user" || !message.entryId) throw new Error("That message can't be rewound.")
    let undo: string | null = null
    if (mode !== "chat") {
      const commit = checkpointBefore(session.sessionManager, message.entryId)
      if (!commit) throw new Error("There is no code checkpoint for that message.")
      undo = await this.checkpoints.restore(commit)
    }
    if (mode !== "code") {
      const result = await session.navigateTree(message.entryId)
      if (!result.cancelled) {
        this.load(this.messages.slice(0, index))
        this.pendingUserIds = []
        this.clearProposal()
        this.setNotice(null)
        this.refreshUsage()
      }
    }
    this.emit(true)
    return { text: message.text, undo }
  }

  // Changes since the checkpoint before the latest user message that has one.
  async turnDiff(): Promise<string> {
    const session = this.session
    if (!session) return ""
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const message = this.messages[index]
      if (message?.role !== "user" || !message.entryId || !message.checkpoint) continue
      const commit = checkpointBefore(session.sessionManager, message.entryId)
      if (commit) return this.checkpoints.diff(commit)
    }
    return ""
  }

  async undoRewind(commit: string): Promise<void> {
    if (this.running) throw new Error("Stop the run first.")
    await this.checkpoints.restore(commit)
  }

  setPlanMode(enabled: boolean): void {
    if (!this.session) throw new Error("The session is not ready.")
    if (this.running) throw new Error("Wait for the run to finish.")
    this.plan.setEnabled(enabled)
  }

  async approvePlan(): Promise<void> {
    if (!this.planProposal) throw new Error("There is no plan to approve.")
    this.plan.setEnabled(false)
    this.clearProposal()
    await this.prompt({ text: APPROVED_PLAN, mentions: [], files: [] })
  }

  // Remote and data URLs load as they are. Project files are copied into the
  // chat's attachments, which the renderer can load and which outlive the file.
  private async resolveImage(image: string): Promise<string> {
    if (/^https?:\/\//i.test(image) || /^data:image\//i.test(image)) return image
    let path = image.replace(/^file:\/\//i, "")
    if (path.startsWith("~/")) path = join(homedir(), path.slice(2))
    path = resolve(this.options.cwd, path)
    const mimeType = IMAGE_TYPES[extname(path).toLowerCase()]
    if (!mimeType) throw new Error("not an image file")
    const info = await stat(path)
    if (info.size > IMAGE_LIMIT) throw new Error("larger than 20 MB")
    const saved = await this.options.saveBytes(basename(path), mimeType, await readFile(path))
    return saved.url
  }

  answerQuestion(id: string, reply: QuestionReply): void {
    if (!this.questions.answer(id, reply)) throw new Error("That question was already answered.")
  }

  private clearProposal(): void {
    if (this.planProposal === null && !this.awaiting) return
    this.planProposal = null
    this.awaiting = false
    this.options.onPlanProposal(null)
  }

  removeQueued(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id)
    this.emit(false)
  }

  async abort(): Promise<void> {
    this.questions.cancel()
    if (!this.session) return
    await this.session.abort()
  }

  async setModel(model: AgentModel): Promise<boolean> {
    if (this.streaming || this.sending || this.session?.isStreaming) {
      this.pendingModel = model
      return false
    }
    if (this.session) await this.session.setModel(model)
    this.refreshUsage()
    this.modelId = model.id
    this.modelName = model.name
    this.options.onModel(model.id)
    this.emit(false)
    return true
  }

  dispose(): void {
    this.questions.cancel()
    this.tasks.stopAll()
    this.disposed = true
    this.sessionToken = null
    this.unsubscribe?.()
    this.unsubscribe = null
    const session = this.session
    this.session = null
    session?.dispose()
  }

  private sessionManager(): SessionManager {
    if (!this.options.sessionFile) return SessionManager.create(this.options.cwd, this.options.sessionDir)
    try {
      return SessionManager.open(this.options.sessionFile, this.options.sessionDir, this.options.cwd)
    } catch {
      return SessionManager.create(this.options.cwd, this.options.sessionDir)
    }
  }

  private setNotice(text: string | null, isError = false): void {
    this.notice = text
    this.noticeIsError = isError
  }

  private enqueue(request: PromptRequest, mode: QueueMode): void {
    this.queue.push({ id: randomUUID(), mode, request })
    this.emit(false)
  }

  // Transcripts for $chat mentions, attached at send time.
  private readChat = async (mention: ChatMention): Promise<ChatMessage[]> => {
    return this.options.library.readTranscript(mention.projectId, mention.chatId)
  }

  private async send(request: PromptRequest): Promise<void> {
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    const prepared = await preparePrompt(request, this.options.saveBytes, this.readChat)
    const message = this.pushUser(request, prepared.attachments)
    // Any reply to a proposed plan is feedback, so the card goes away.
    this.clearProposal()
    this.setNotice(null)
    // Todo lists belong to the turn that created them; drop the previous
    // turn's list so a finished list doesn't linger over the new ask.
    this.todos = []
    this.emit(true)
    try {
      await session.prompt(prepared.text, { images: promptImages(prepared.images) })
    } catch (error) {
      const last = this.messages[this.messages.length - 1]
      if (last?.id === message.id) this.messages = this.messages.filter((item) => item.id !== message.id)
      this.streaming = false
      this.setNotice(errorMessage(error), true)
      this.emit(true)
      throw error
    } finally {
      // Extension commands finish without a user message reaching the session.
      this.pendingUserIds = this.pendingUserIds.filter((item) => item !== message.id)
    }
  }

  // Moves the session leaf to just before the message, drops it and everything
  // after it from the transcript, and sends the new text on a fresh branch.
  async editMessage(id: string, text: string): Promise<void> {
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    if (this.running || session.isStreaming) throw new Error("Stop the run before editing a message.")
    const index = this.messages.findIndex((message) => message.id === id)
    const message = this.messages[index]
    if (!message || message.role !== "user") throw new Error("That message is gone.")
    if (!message.entryId) throw new Error("This message was sent before editing was available.")
    const result = await session.navigateTree(message.entryId)
    if (result.cancelled) return
    this.load(this.messages.slice(0, index))
    this.pendingUserIds = []
    this.setNotice(null)
    this.refreshUsage()
    this.emit(false)
    await this.prompt({ text, mentions: [], files: [] })
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
    this.pendingUserIds.push(message.id)
    this.markFirstMessage()
    return message
  }

  // Pi appends the entry right after emitting message_end, so the leaf is read
  // once the current tick finishes. User messages that slagent did not send,
  // such as ones from extensions, are added to the transcript here.
  private noteUserEntry(content: unknown): void {
    const session = this.session
    const id = this.pendingUserIds.shift()
    queueMicrotask(() => {
      if (!session || this.session !== session) return
      const entryId = session.sessionManager.getLeafId() ?? undefined
      if (id) {
        const message = this.messages.find((item) => item.id === id)
        if (message?.role === "user") {
          message.entryId = entryId
          message.checkpoint = Boolean(entryId && checkpointBefore(session.sessionManager, entryId))
          this.emit(false)
        }
        return
      }
      const text = userText(content)
      if (!text) return
      this.messages.push({ id: randomUUID(), role: "user", text, attachments: [], entryId })
      this.emit(false)
    })
  }

  // The first user message only flips the flag. The title itself comes from the
  // naming model, so a chat stays "New chat" until that model replies.
  private markFirstMessage(): void {
    if (this.named) return
    this.named = true
  }

  // Names the chat once the first exchange has settled.
  private async autoTitle(): Promise<void> {
    if (this.titleGenerated) return
    this.titleGenerated = true
    const user = this.messages.find((message) => message.role === "user")
    if (!user || user.role !== "user" || !user.text) return
    let assistant = ""
    for (const message of this.messages) {
      if (message.role === "assistant" && message.text) assistant = message.text
    }
    try {
      const title = await this.options.generateTitle(user.text, assistant)
      if (!title || this.disposed) return
      this.session?.setSessionName(title)
      this.options.onTitle(title, true)
    } catch {
      // The chat keeps its placeholder title.
    }
  }

  private onEvent(event: AgentSessionEvent): void {
    if (event.type === "message_end" && event.message.role === "user") {
      this.noteUserEntry(event.message.content)
      return
    }

    if (event.type === "message_start" && event.message.role === "assistant") {
      this.ensureAssistant()
      this.emit(false)
      return
    }

    if (event.type === "message_update" && event.message.role === "assistant") {
      const bubble = this.ensureAssistant()
      const update = event.assistantMessageEvent
      if (update.type === "text_delta") bubble.text += update.delta
      if (update.type === "thinking_delta") {
        if (bubble.thinking) bubble.thinking += update.delta
        else bubble.thinking = update.delta
      }
      this.emit(false)
      return
    }

    if (event.type === "message_end" && event.message.role === "assistant") {
      const bubble = this.ensureAssistant()
      const parts = assistantParts(event.message.content)
      if (parts.text) bubble.text = parts.text
      if (parts.thinking) bubble.thinking = parts.thinking
      bubble.streaming = false
      bubble.error = event.message.errorMessage ?? null
      this.currentAssistantId = null
      // Pi saves the message, and its usage, right after this event.
      queueMicrotask(() => {
        this.refreshUsage()
        this.emit(false)
      })
      this.emit(false)
      return
    }

    if (event.type === "tool_execution_start") {
      const tool: ToolMessage = {
        id: event.toolCallId,
        role: "tool",
        name: event.toolName,
        label: toolLabel(event.toolName, event.args),
        args: formatValue(event.args),
        output: "",
        images: [],
        running: true,
        isError: false,
      }
      this.messages.push(tool)
      this.emit(false)
      return
    }

    if (event.type === "tool_execution_update") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.partialResult)
      this.emit(false)
      return
    }

    if (event.type === "tool_execution_end") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.result)
      tool.running = false
      tool.isError = event.isError
      if (event.toolName === ASK_USER) {
        const details = (event.result as { details?: AskUserDetails } | undefined)?.details
        if (details && Array.isArray(details.answers)) tool.answers = details.answers
      }
      const images = toolResultImages(event.result)
      if (images.length > 0) void this.attachImages(tool, images)
      this.emit(false)
      return
    }

    if (event.type === "agent_start") {
      this.streaming = true
      this.setNotice(null)
      this.emit(true)
      void this.deliverPendingSteers()
      return
    }

    if (event.type === "agent_settled") {
      this.streaming = false
      this.setNotice(null)
      this.finishStreamingMessages()
      const pending = this.pendingModel
      this.pendingModel = null
      if (pending && this.session) {
        const session = this.session
        void session.setModel(pending).then(() => {
          this.refreshUsage()
          this.modelId = pending.id
          this.modelName = pending.name
          this.options.onModel(pending.id)
          this.emit(false)
        })
      }
      this.emit(true)
      this.scheduleFlush()
      this.options.onSettled()
      void this.autoTitle()
      return
    }

    if (event.type === "auto_retry_start") {
      this.setNotice(`Retrying ${event.attempt} of ${event.maxAttempts}`)
      this.emit(false)
      return
    }

    if (event.type === "compaction_start") {
      this.setNotice("Summarizing earlier messages")
      this.emit(false)
      return
    }

    if (event.type === "compaction_end" || event.type === "auto_retry_end") {
      this.setNotice(null)
      this.refreshUsage()
      this.emit(false)
    }
  }

  private async attachImages(tool: ToolMessage, images: { data: string; mimeType: string }[]): Promise<void> {
    const urls: string[] = []
    for (const image of images) {
      const saved = await this.options.saveBytes(imageName(image.mimeType), image.mimeType, Buffer.from(image.data, "base64"))
      urls.push(saved.url)
    }
    tool.images = urls
    this.emit(false)
  }

  private ensureAssistant(): AssistantMessage {
    if (this.currentAssistantId) {
      const existing = this.messages.find((message) => message.id === this.currentAssistantId)
      if (existing && existing.role === "assistant") return existing
    }
    const message: AssistantMessage = {
      id: randomUUID(),
      role: "assistant",
      text: "",
      thinking: "",
      streaming: true,
      error: null,
    }
    this.currentAssistantId = message.id
    this.messages.push(message)
    return message
  }

  private findTool(id: string): ToolMessage | null {
    const message = this.messages.find((item) => item.id === id)
    if (!message || message.role !== "tool") return null
    return message
  }

  private finishStreamingMessages(): void {
    for (const message of this.messages) {
      if (message.role === "assistant") message.streaming = false
      if (message.role === "tool") message.running = false
    }
    this.currentAssistantId = null
  }

  private async deliverPendingSteers(): Promise<void> {
    const session = this.session
    if (!session) return
    const pending = this.queue.filter((item) => item.mode === "steer")
    if (pending.length === 0) return
    const ids = new Set(pending.map((item) => item.id))
    this.queue = this.queue.filter((item) => !ids.has(item.id))
    for (const item of pending) {
      const prepared = await preparePrompt(item.request, this.options.saveBytes)
      this.pushUser(item.request, prepared.attachments)
      this.emit(false)
      try {
        await session.steer(prepared.text, promptImages(prepared.images))
      } catch (error) {
        this.setNotice(errorMessage(error), true)
        this.emit(false)
      }
    }
  }

  private scheduleFlush(): void {
    queueMicrotask(() => {
      void this.flushFollowUp()
    })
  }

  private async flushFollowUp(): Promise<void> {
    if (this.sending || this.streaming || this.session?.isStreaming) return
    const next = this.queue.find((item) => item.mode === "follow-up")
    if (!next) return
    this.queue = this.queue.filter((item) => item.id !== next.id)
    this.sending = true
    this.emit(true)
    try {
      await this.send(next.request)
    } catch (error) {
      this.setNotice(errorMessage(error), true)
      this.emit(false)
    } finally {
      this.sending = false
      this.emit(true)
      this.scheduleFlush()
    }
  }

  private rememberExtensions(result: {
    extensions: { hidden?: boolean; sourceInfo: { path: string; scope: string } }[]
    errors: { path: string; error: string }[]
  }): void {
    const extensions: ExtensionInfo[] = []
    for (const extension of result.extensions) {
      if (extension.hidden) continue
      extensions.push({
        id: extension.sourceInfo.path,
        name: extensionLabel(extension.sourceInfo.path),
        scope: extension.sourceInfo.scope,
      })
    }
    this.extensions = extensions
    this.extensionErrors = result.errors.map((item) => `${basename(item.path)}: ${item.error}`)
    this.options.onExtensions(extensions, this.extensionErrors)
  }

  private emit(runningChanged: boolean): void {
    if (this.disposed) return
    const running = this.streaming || this.sending
    let changed = runningChanged
    if (running !== this.lastRunning) changed = true
    this.lastRunning = running
    this.options.onChange(changed)
  }
}

function extensionLabel(filePath: string): string {
  const file = basename(filePath)
  const dot = file.lastIndexOf(".")
  const stem = dot > 0 ? file.slice(0, dot) : file
  if (stem !== "index") return stem

  const skip = new Set(["src", "dist", "lib", "extensions", "node_modules"])
  let dir = dirname(filePath)
  for (let depth = 0; depth < 4; depth += 1) {
    const parent = basename(dir)
    if (parent && !skip.has(parent)) return parent
    const next = dirname(dir)
    if (next === dir) break
    dir = next
  }
  return stem
}

function imageName(mimeType: string): string {
  if (mimeType === "image/jpeg") return "snapshot.jpg"
  if (mimeType === "image/gif") return "snapshot.gif"
  if (mimeType === "image/webp") return "snapshot.webp"
  return "snapshot.png"
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  if (message.role === "user" && !message.attachments) message.attachments = []
  if (message.role === "tool" && !message.images) message.images = []
  return message
}

function userText(content: unknown): string {
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""
  const parts: string[] = []
  for (const part of content) {
    if (typeof part === "object" && part !== null && (part as { type?: string }).type === "text") {
      parts.push(String((part as { text?: unknown }).text ?? ""))
    }
  }
  return parts.join("\n").trim()
}

function promptImages(images: ImageContent[]): ImageContent[] | undefined {
  if (images.length === 0) return undefined
  return images
}
