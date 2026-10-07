import { randomUUID } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { basename, dirname } from "node:path"
import {
  type AgentSession,
  type AgentSessionEvent,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  type InlineExtension,
  type ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent"
import type { ImageContent } from "@earendil-works/pi-ai"
import type {
  AssistantMessage,
  ChatMessage,
  ExtensionInfo,
  QueueMode,
  PromptRequest,
  TodoItem,
  SlashCommand,
  ToolMessage,
  TranscriptState,
  UserAttachment,
  UsageState,
  UserMessage,
} from "../shared/types"
import { sessionCommands } from "./commands"
import { COMPUTER_TOOL_NAMES, computerTools } from "./computer-tools"
import type { ComputerGate } from "./computer-gate"
import type { ComputerUse } from "./computer"
import { assistantParts, bashCommand, errorMessage, formatValue, toolLabel, toolResultImages, toolResultText } from "./format"
import { focusGuard } from "./extensions/focus-guard"
import { todoExtension } from "./extensions/todo"
import { preparePrompt, queueDetail } from "./prompt"

// Pi treats the tools list as an allowlist, so tools from slagent's own
// extensions are named here too.
const CODING_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls", "todo"]

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
  sessionFile: string | null
  model: AgentModel
  named: boolean
  titleGenerated: boolean
  computer: ComputerUse
  gate: ComputerGate
  modelRuntime: ModelRuntime
  onChange: (runningChanged: boolean) => void
  onExtensions: (extensions: ExtensionInfo[], errors: string[]) => void
  onTitle: (title: string, generated: boolean) => void
  generateTitle: (user: string, assistant: string) => Promise<string | null>
  onModel: (modelId: string) => void
  onSettled: () => void
  saveBytes: (name: string, mimeType: string, bytes: Buffer) => Promise<SavedFile>
}

export class ChatRuntime {
  readonly projectId: string
  readonly chatId: string
  modelId: string
  modelName: string
  messages: ChatMessage[] = []
  private queue: Pending[] = []
  private terminal = ""
  private terminalStreaming = false
  private streaming = false
  private sending = false
  private notice: string | null = null
  private noticeIsError = false
  private awaiting = false
  private usageState: UsageState | null = null
  private todos: TodoItem[] = []
  // Transcript user messages waiting for Pi to persist them, oldest first.
  private pendingUserIds: string[] = []
  private named: boolean
  private titleGenerated: boolean
  private session: AgentSession | null = null
  private unsubscribe: (() => void) | null = null
  private sessionToken: object | null = null
  private bashBlocks = new Map<string, { command: string; output: string }>()
  private bashOrder: string[] = []
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
  }

  get key(): string {
    return `${this.projectId}:${this.chatId}`
  }

  get running(): boolean {
    return this.streaming || this.sending
  }

  // Set by features that pause a run for the user, such as plan approval.
  get waiting(): boolean {
    return this.awaiting
  }

  get failed(): boolean {
    if (this.running) return false
    if (this.notice) return this.noticeIsError
    const last = this.messages[this.messages.length - 1]
    return last?.role === "assistant" && Boolean(last.error)
  }

  load(messages: ChatMessage[]): void {
    this.messages = messages.map(normalizeMessage)
    this.bashBlocks.clear()
    this.bashOrder = []
    for (const message of this.messages) {
      if (message.role !== "tool" || message.name !== "bash") continue
      this.bashOrder.push(message.id)
      let command = message.label
      if (command.startsWith("bash  ")) command = command.slice("bash  ".length)
      this.bashBlocks.set(message.id, { command, output: message.output })
    }
    this.syncTerminal()
  }

  lockTitle(): void {
    this.named = true
    this.titleGenerated = true
  }

  transcript(): TranscriptState {
    return {
      messages: this.messages,
      streaming: this.streaming,
      notice: this.notice,
      queue: this.queue.map((item) => ({
        id: item.id,
        text: item.request.text,
        mode: item.mode,
        detail: queueDetail(item.request),
      })),
      terminal: this.terminal,
      terminalStreaming: this.terminalStreaming,
      usage: this.usageState,
      todos: this.todos,
    }
  }

  // Stats walk every session entry, so they refresh at message boundaries
  // rather than on each streamed delta.
  private refreshUsage(): void {
    this.usageState = this.readUsage()
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
    const extensionFactories: InlineExtension[] = [
      todoExtension((todos) => {
        this.todos = todos
        this.emit(false)
      }),
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
      const prepared = await preparePrompt(item.request, this.options.saveBytes)
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

  removeQueued(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id)
    this.emit(false)
  }

  clearTerminal(): void {
    this.bashBlocks.clear()
    this.bashOrder = []
    this.terminal = ""
    this.terminalStreaming = false
    this.emit(false)
  }

  async abort(): Promise<void> {
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

  private async send(request: PromptRequest): Promise<void> {
    const session = this.session
    if (!session) throw new Error("The session is not ready.")
    const prepared = await preparePrompt(request, this.options.saveBytes)
    const message = this.pushUser(request, prepared.attachments)
    this.setNotice(null)
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
    }
    this.messages.push(message)
    this.pendingUserIds.push(message.id)
    this.markTitle(message.text, attachments)
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
        if (message?.role === "user") message.entryId = entryId
        return
      }
      const text = userText(content)
      if (!text) return
      this.messages.push({ id: randomUUID(), role: "user", text, attachments: [], entryId })
      this.emit(false)
    })
  }

  private markTitle(text: string, attachments: UserAttachment[]): void {
    if (this.named) return
    this.named = true
    let title = text.split("\n")[0]?.trim() ?? ""
    if (!title) {
      const first = attachments[0]
      if (first) title = first.name
    }
    if (!title) title = "New chat"
    this.options.onTitle(title.slice(0, 80), false)
  }

  // Replaces the first-line placeholder with a short generated title once the
  // first exchange has settled.
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
      // The first-line title stays.
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
      this.refreshUsage()
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
      if (event.toolName === "bash") this.noteBash(event.toolCallId, bashCommand(event.args), "")
      this.emit(false)
      return
    }

    if (event.type === "tool_execution_update") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.partialResult)
      if (tool.name === "bash") this.noteBash(event.toolCallId, tool.label, tool.output)
      this.emit(false)
      return
    }

    if (event.type === "tool_execution_end") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.result)
      tool.running = false
      tool.isError = event.isError
      if (tool.name === "bash") this.noteBash(event.toolCallId, tool.label, tool.output)
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
    this.syncTerminal()
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

  private noteBash(id: string, command: string, output: string): void {
    const existing = this.bashBlocks.get(id)
    if (!existing) this.bashOrder.push(id)
    let nextCommand = command
    if (existing) nextCommand = existing.command
    this.bashBlocks.set(id, { command: nextCommand, output })
    this.syncTerminal()
  }

  private syncTerminal(): void {
    const parts: string[] = []
    for (const id of this.bashOrder) {
      const block = this.bashBlocks.get(id)
      if (!block) continue
      if (block.output) parts.push(`$ ${block.command}\n${block.output}`)
      else parts.push(`$ ${block.command}`)
    }
    this.terminal = parts.join("\n\n")
    this.terminalStreaming = this.messages.some((message) => {
      return message.role === "tool" && message.name === "bash" && message.running
    })
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
