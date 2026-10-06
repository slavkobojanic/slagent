import { realpath, stat } from "node:fs/promises"
import { basename, dirname } from "node:path"
import { homedir } from "node:os"
import {
  type AgentSession,
  type AgentSessionEvent,
  createAgentSession,
  getAgentDir,
  type ModelRuntime,
  ModelRuntime as ModelRuntimeClass,
} from "@earendil-works/pi-coding-agent"
import type {
  AppMeta,
  AssistantMessage,
  ChatMessage,
  ExtensionInfo,
  OpenRouterStatus,
  QueueMode,
  QueuedMessage,
  Snapshot,
  ToolMessage,
  TranscriptState,
  UiEvent,
} from "../shared/types"
import { assistantParts, bashCommand, errorMessage, formatValue, toolLabel, toolResultText } from "./format"
import { readPrefs, writePrefs, type Prefs } from "./prefs"
import { COMPUTER_TOOL_NAMES, computerTools } from "./computer-tools"
import type { ComputerUse } from "./computer"

const PROVIDER = "openrouter"
const CODING_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls"]
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

const PREFERRED_MODELS = [
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.4",
]

type Emit = (event: UiEvent) => void

export class AgentHost {
  private modelRuntime: ModelRuntime | null = null
  private session: AgentSession | null = null
  private unsubscribe: (() => void) | null = null
  private sessionToken: object | null = null
  private prefs: Prefs = {}
  private cwd = homedir()
  private agentDir = getAgentDir()
  private modelId: string | null = null
  private modelName: string | null = null
  private models: AppMeta["models"] = []
  private openRouter: OpenRouterStatus = { configured: false, source: null, type: null }
  private extensions: ExtensionInfo[] = []
  private extensionErrors: string[] = []
  private messages: ChatMessage[] = []
  private queue: QueuedMessage[] = []
  private terminal = ""
  private terminalStreaming = false
  private bashBlocks = new Map<string, { command: string; output: string }>()
  private bashOrder: string[] = []
  private streaming = false
  private sending = false
  private notice: string | null = null
  private ready = false
  private startupError: string | null = null
  private currentAssistantId: string | null = null
  private idCounter = 0
  private revision = 0
  private tail: Promise<void> = Promise.resolve()

  constructor(
    private readonly prefsPath: string,
    private readonly emit: Emit,
    private readonly computer: ComputerUse,
  ) {}

  getCwd(): string {
    return this.cwd
  }

  getSnapshot(): Snapshot {
    return {
      revision: this.revision,
      meta: this.buildMeta(),
      ...this.transcriptState(),
    }
  }

  async start(): Promise<void> {
    try {
      this.prefs = await readPrefs(this.prefsPath)
      this.modelId = this.prefs.modelId ?? null
      this.cwd = await this.resolveInitialCwd(this.prefs.cwd)
      this.modelRuntime = await ModelRuntimeClass.create({ refreshOnCreate: false })
      this.models = this.catalog()
      this.openRouter = await this.readAuth()
      await this.replaceSession()
    } catch (error) {
      this.startupError = errorMessage(error)
      this.publishMeta()
    } finally {
      this.ready = true
      this.publishMeta()
      this.publishTranscript()
    }
  }

  async prompt(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed) throw new Error("Write a message first.")
    if (!this.session) throw new Error(this.startupError ?? "The session is not ready.")
    if (!this.openRouter.configured) throw new Error("Add an OpenRouter API key in settings.")
    if (this.streaming || this.sending || this.session.isStreaming) {
      this.queue.push({ id: this.nextId("queue"), text: trimmed, mode: "follow-up" })
      this.publishTranscript()
      return
    }
    await this.send(trimmed)
  }

  async setQueueMode(id: string, mode: QueueMode): Promise<void> {
    const index = this.queue.findIndex((item) => item.id === id)
    const item = this.queue[index]
    if (!item) return
    if (mode === "follow-up") {
      item.mode = "follow-up"
      this.publishTranscript()
      return
    }
    const session = this.session
    if (!session) throw new Error(this.startupError ?? "The session is not ready.")
    if (session.isStreaming || this.streaming) {
      this.queue.splice(index, 1)
      this.messages.push({ id: this.nextId("user"), role: "user", text: item.text })
      this.publishTranscript()
      await session.steer(item.text)
      return
    }
    if (this.sending) {
      item.mode = "steer"
      this.publishTranscript()
      return
    }
    this.queue.splice(index, 1)
    this.publishTranscript()
    await this.send(item.text)
  }

  removeQueued(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id)
    this.publishTranscript()
  }

  clearTerminal(): void {
    this.bashBlocks.clear()
    this.bashOrder = []
    this.terminal = ""
    this.terminalStreaming = false
    this.publishTranscript()
  }

  async abort(): Promise<void> {
    if (!this.session) return
    await this.session.abort()
  }

  async newSession(): Promise<void> {
    await this.run(async () => {
      if (this.session?.isStreaming) await this.session.abort()
      await this.replaceSession()
    })
  }

  async setCwd(cwd: string): Promise<void> {
    const resolved = await this.assertDirectory(cwd)
    await this.run(async () => {
      if (resolved === this.cwd && this.session) return
      if (this.session?.isStreaming) await this.session.abort()
      this.cwd = resolved
      await this.persistPrefs()
      await this.replaceSession()
    })
  }

  async setModel(modelId: string): Promise<void> {
    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")
    const model = runtime.getModel(PROVIDER, modelId)
    if (!model || model.id.includes(":batch")) throw new Error("That model is not available.")
    if (this.session?.isStreaming || this.streaming) {
      throw new Error("Stop the agent before changing models.")
    }
    this.modelId = model.id
    this.modelName = model.name
    await this.persistPrefs()
    if (this.session) await this.session.setModel(model)
    this.startupError = null
    this.publishMeta()
  }

  async saveOpenRouterKey(apiKey: string): Promise<void> {
    const key = apiKey.trim()
    if (!key) throw new Error("Enter an API key.")
    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")

    try {
      await runtime.login(PROVIDER, "api_key", {
        signal: AbortSignal.timeout(20_000),
        prompt: async (prompt) => {
          if (prompt.type === "secret" || prompt.type === "text") return key
          throw new Error("OpenRouter asked for an unexpected login step.")
        },
        notify: () => undefined,
      })
    } catch (error) {
      this.openRouter = await this.readAuth()
      this.publishMeta()
      if (!this.openRouter.configured) throw error
    }

    this.models = this.catalog()
    this.openRouter = await this.readAuth()
    if (!this.session) await this.replaceSession()
    this.publishMeta()
  }

  async logoutOpenRouter(): Promise<void> {
    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")
    await runtime.logout(PROVIDER, { signal: AbortSignal.timeout(20_000) })
    this.openRouter = await this.readAuth()
    this.publishMeta()
  }

  close(): void {
    this.closeSession()
  }

  private async replaceSession(): Promise<void> {
    this.closeSession()
    this.messages = []
    this.queue = []
    this.bashBlocks.clear()
    this.bashOrder = []
    this.terminal = ""
    this.terminalStreaming = false
    this.streaming = false
    this.sending = false
    this.notice = null
    this.currentAssistantId = null
    this.extensions = []
    this.extensionErrors = []
    this.publishTranscript()

    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")

    const model = this.selectModel(runtime)
    if (!model) {
      this.modelId = null
      this.modelName = null
      this.startupError = "No OpenRouter models are available."
      this.publishMeta()
      return
    }

    this.modelId = model.id
    this.modelName = model.name
    await this.persistPrefs()

    let toolNames = CODING_TOOLS
    let customTools: ReturnType<typeof computerTools> = []
    if (process.platform === "darwin") {
      toolNames = [...CODING_TOOLS, ...COMPUTER_TOOL_NAMES]
      customTools = computerTools(this.computer)
    }

    const { session, extensionsResult } = await createAgentSession({
      cwd: this.cwd,
      modelRuntime: runtime,
      model,
      tools: toolNames,
      customTools,
    })

    this.session = session
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
          this.publishMeta()
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
    }

    this.startupError = null
    this.publishMeta()
  }

  private closeSession(): void {
    this.sessionToken = null
    this.unsubscribe?.()
    this.unsubscribe = null
    const session = this.session
    this.session = null
    session?.dispose()
  }

  private onEvent(event: AgentSessionEvent): void {
    if (event.type === "message_start" && event.message.role === "assistant") {
      this.ensureAssistant()
      this.publishTranscript()
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
      this.publishTranscript()
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
      this.publishTranscript()
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
        running: true,
        isError: false,
      }
      this.messages.push(tool)
      if (event.toolName === "bash") this.noteBash(event.toolCallId, bashCommand(event.args), "")
      this.publishTranscript()
      return
    }

    if (event.type === "tool_execution_update") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.partialResult)
      if (tool.name === "bash") this.noteBash(event.toolCallId, tool.label, tool.output)
      this.publishTranscript()
      return
    }

    if (event.type === "tool_execution_end") {
      const tool = this.findTool(event.toolCallId)
      if (!tool) return
      tool.output = toolResultText(event.result)
      tool.running = false
      tool.isError = event.isError
      if (tool.name === "bash") this.noteBash(event.toolCallId, tool.label, tool.output)
      this.publishTranscript()
      return
    }

    if (event.type === "agent_start") {
      this.streaming = true
      this.notice = null
      this.publishTranscript()
      void this.deliverPendingSteers()
      return
    }

    if (event.type === "agent_settled") {
      this.streaming = false
      this.notice = null
      this.finishStreamingMessages()
      this.publishTranscript()
      this.scheduleFlush()
      return
    }

    if (event.type === "auto_retry_start") {
      this.notice = `Retrying ${event.attempt} of ${event.maxAttempts}`
      this.publishTranscript()
      return
    }

    if (event.type === "compaction_start") {
      this.notice = "Summarizing earlier messages"
      this.publishTranscript()
      return
    }

    if (event.type === "compaction_end" || event.type === "auto_retry_end") {
      this.notice = null
      this.publishTranscript()
    }
  }

  private ensureAssistant(): AssistantMessage {
    if (this.currentAssistantId) {
      const existing = this.messages.find((message) => message.id === this.currentAssistantId)
      if (existing && existing.role === "assistant") return existing
    }
    const message: AssistantMessage = {
      id: this.nextId("assistant"),
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

  private async send(text: string): Promise<void> {
    const session = this.session
    if (!session) throw new Error(this.startupError ?? "The session is not ready.")
    const id = this.nextId("user")
    this.messages.push({ id, role: "user", text })
    this.notice = null
    this.sending = true
    this.publishTranscript()
    try {
      await session.prompt(text)
    } catch (error) {
      const last = this.messages[this.messages.length - 1]
      if (last?.id === id) this.messages = this.messages.filter((message) => message.id !== id)
      this.streaming = false
      this.notice = errorMessage(error)
      this.publishTranscript()
      throw error
    } finally {
      this.sending = false
      this.scheduleFlush()
    }
  }

  private async deliverPendingSteers(): Promise<void> {
    const session = this.session
    if (!session) return
    const pending = this.queue.filter((item) => item.mode === "steer")
    if (pending.length === 0) return
    const ids = new Set(pending.map((item) => item.id))
    this.queue = this.queue.filter((item) => !ids.has(item.id))
    for (const item of pending) {
      this.messages.push({ id: this.nextId("user"), role: "user", text: item.text })
    }
    this.publishTranscript()
    for (const item of pending) {
      try {
        await session.steer(item.text)
      } catch (error) {
        this.notice = errorMessage(error)
        this.publishTranscript()
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
    this.publishTranscript()
    try {
      await this.send(next.text)
    } catch (error) {
      this.notice = errorMessage(error)
      this.publishTranscript()
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

  private selectModel(runtime: ModelRuntime): ReturnType<ModelRuntime["getModel"]> {
    if (this.modelId) {
      const saved = runtime.getModel(PROVIDER, this.modelId)
      if (saved && !saved.id.includes(":batch")) return saved
    }
    for (const id of PREFERRED_MODELS) {
      const preferred = runtime.getModel(PROVIDER, id)
      if (preferred) return preferred
    }
    const first = this.models[0]
    if (!first) return undefined
    return runtime.getModel(PROVIDER, first.id)
  }

  private catalog(): AppMeta["models"] {
    const runtime = this.modelRuntime
    if (!runtime) return []
    const models = runtime.getModels(PROVIDER)
    const options: AppMeta["models"] = []
    for (const model of models) {
      if (model.id.includes(":batch")) continue
      options.push({
        id: model.id,
        name: model.name,
        contextWindow: model.contextWindow,
        reasoning: model.reasoning,
      })
    }
    options.sort((left, right) => left.name.localeCompare(right.name))
    return options
  }

  private async readAuth(): Promise<OpenRouterStatus> {
    const runtime = this.modelRuntime
    if (!runtime) return { configured: false, source: null, type: null }
    const check = await runtime.checkAuth(PROVIDER, { signal: AbortSignal.timeout(15_000) })
    if (!check) return { configured: false, source: null, type: null }
    return {
      configured: true,
      source: check.source ?? null,
      type: check.type,
    }
  }

  private rememberExtensions(result: { extensions: { hidden?: boolean; sourceInfo: { path: string; scope: string } }[]; errors: { path: string; error: string }[] }): void {
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
  }

  private async resolveInitialCwd(preferred: string | undefined): Promise<string> {
    if (preferred) {
      try {
        return await this.assertDirectory(preferred)
      } catch {
        return homedir()
      }
    }
    return homedir()
  }

  private async assertDirectory(cwd: string): Promise<string> {
    const resolved = await realpath(cwd)
    const info = await stat(resolved)
    if (!info.isDirectory()) throw new Error("Choose a folder.")
    return resolved
  }

  private async persistPrefs(): Promise<void> {
    this.prefs = { cwd: this.cwd, modelId: this.modelId ?? undefined }
    await writePrefs(this.prefsPath, this.prefs)
  }

  private buildMeta(): AppMeta {
    return {
      ready: this.ready,
      error: this.startupError,
      cwd: this.cwd,
      agentDir: this.agentDir,
      modelId: this.modelId,
      modelName: this.modelName,
      models: this.models,
      openRouter: this.openRouter,
      extensions: this.extensions,
      extensionErrors: this.extensionErrors,
    }
  }

  private publishMeta(): void {
    this.revision += 1
    this.emit({ type: "meta", revision: this.revision, meta: this.buildMeta() })
  }

  private transcriptState(): TranscriptState {
    return {
      messages: this.messages,
      streaming: this.streaming,
      notice: this.notice,
      queue: this.queue.map((item) => ({ id: item.id, text: item.text, mode: item.mode })),
      terminal: this.terminal,
      terminalStreaming: this.terminalStreaming,
    }
  }

  private publishTranscript(): void {
    this.revision += 1
    this.emit({
      type: "transcript",
      revision: this.revision,
      ...this.transcriptState(),
    })
  }

  private nextId(prefix: string): string {
    this.idCounter += 1
    return `${prefix}-${this.idCounter}`
  }

  private run(task: () => Promise<void>): Promise<void> {
    const next = this.tail.then(task, task)
    this.tail = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
}
