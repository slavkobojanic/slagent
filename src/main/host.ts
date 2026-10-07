import { randomUUID } from "node:crypto"
import { mkdir, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getAgentDir, ModelRuntime as ModelRuntimeClass, type ModelRuntime } from "@earendil-works/pi-coding-agent"
import type {
  AppMeta,
  ChatMessage,
  ChatSearchResult,
  DiffScope,
  GitStatus,
  ChatStatus,
  ChatSummary,
  ExtensionInfo,
  LibraryState,
  ModelChange,
  OpenRouterStatus,
  ProjectSummary,
  PromptRequest,
  QueueMode,
  RewindMode,
  RewindResult,
  SlashCommand,
  Snapshot,
  TranscriptState,
  UiEvent,
  UsageTotals,
} from "../shared/types"
import { ChatRuntime, type AgentModel } from "./chat-runtime"
import type { ComputerUse } from "./computer"
import { draftCommands } from "./commands"
import { searchChats } from "./search"
import { ComputerGate } from "./computer-gate"
import { searchProjectFiles } from "./files"
import { errorMessage } from "./format"
import { assertDirectory, Library, type StoredChat } from "./library"
import { readPrefs, writePrefs, type Prefs } from "./prefs"
import { generateCommitMessage, generateTitle, TITLE_MODELS } from "./titles"
import { createPullRequest, gitCommit, gitDiff, gitPush, gitStatus } from "./git"

const PROVIDER = "openrouter"
const PREFERRED_MODELS = [
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.4",
]

type Emit = (event: UiEvent) => void

export type Notifier = {
  // Whether the window is in front, so finished runs in the open chat are seen.
  focused: () => boolean
  notify: (note: { title: string; body: string; projectId: string; chatId: string }) => void
  badge: (count: number) => void
}

type ExtensionCache = {
  extensions: ExtensionInfo[]
  errors: string[]
}

export class AgentHost {
  private modelRuntime: ModelRuntime | null = null
  private readonly library: Library
  private readonly gate = new ComputerGate()
  private readonly runtimes = new Map<string, ChatRuntime>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly extensionCache = new Map<string, ExtensionCache>()
  private prefs: Prefs = {}
  private projectId: string | null = null
  private chatId: string | null = null
  private cwd = ""
  private agentDir = getAgentDir()
  private draftModelId: string | null = null
  private draftModelName: string | null = null
  private draftPlanMode = false
  private models: AppMeta["models"] = []
  private openRouter: OpenRouterStatus = { configured: false, source: null, type: null }
  private ready = false
  private startupError: string | null = null
  private revision = 0
  private tail: Promise<void> = Promise.resolve()

  constructor(
    private readonly prefsPath: string,
    libraryRoot: string,
    private readonly emit: Emit,
    private readonly computer: ComputerUse,
    private readonly notifier: Notifier,
  ) {
    this.library = new Library(libraryRoot)
  }

  getCwd(): string {
    if (this.cwd) return this.cwd
    return this.prefs.cwd ?? ""
  }

  getSnapshot(): Snapshot {
    return {
      revision: this.revision,
      meta: this.buildMeta(),
      library: this.libraryState(),
      ...this.transcriptState(),
    }
  }

  async start(): Promise<void> {
    try {
      this.prefs = await readPrefs(this.prefsPath)
      this.draftModelId = this.prefs.modelId ?? null
      await this.library.load()
      this.modelRuntime = await ModelRuntimeClass.create({ refreshOnCreate: false })
      this.models = this.catalog()
      this.openRouter = await this.readAuth()
      this.applyDraftModel()
      const initial = await this.initialProject()
      if (initial) await this.openProjectUnlocked(initial.id)
    } catch (error) {
      this.startupError = errorMessage(error)
    } finally {
      this.ready = true
      this.publishAll()
    }
  }

  async prompt(request: PromptRequest): Promise<void> {
    const runtime = await this.run(() => this.ensureRuntime())
    await runtime.prompt(request)
  }

  async abort(): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) return
    await runtime.abort()
  }

  async newChat(): Promise<void> {
    await this.run(async () => {
      if (!this.projectId) throw new Error("Choose a folder first.")
      this.chatId = null
      await this.library.rememberChat(this.projectId, null)
      this.publishLibrary()
      this.publishTranscript()
    })
  }

  async openFolder(folder: string): Promise<void> {
    await this.run(async () => {
      const project = await this.library.ensureProject(folder)
      await this.openProjectUnlocked(project.id)
    })
  }

  async openProject(projectId: string): Promise<void> {
    await this.run(() => this.openProjectUnlocked(projectId))
  }

  async openChat(chatId: string, projectId?: string): Promise<void> {
    await this.run(async () => {
      const target = projectId ?? this.projectId
      if (!target) throw new Error("Choose a folder first.")
      if (target !== this.projectId) {
        const project = this.library.project(target)
        if (!project) throw new Error("That project is gone.")
        try {
          await assertDirectory(project.path)
        } catch {
          throw new Error("That folder is missing.")
        }
        await this.loadChat(target, chatId)
        await this.persistPrefs()
      } else {
        await this.loadChat(target, chatId)
      }
      this.publishAll()
    })
  }

  async searchChats(query: string): Promise<ChatSearchResult[]> {
    return searchChats(this.library, query, (projectId, chatId) => this.runtimeFor(projectId, chatId)?.messages ?? null)
  }

  async pinProject(projectId: string, pinned: boolean): Promise<void> {
    await this.run(async () => {
      await this.library.setPinned(projectId, pinned)
      this.publishLibrary()
    })
  }

  async pinChat(chatId: string, pinned: boolean): Promise<void> {
    await this.run(async () => {
      if (!this.projectId) return
      await this.library.setChatPinned(this.projectId, chatId, pinned)
      this.publishLibrary()
    })
  }

  async renameChat(chatId: string, title: string): Promise<void> {
    await this.run(async () => {
      if (!this.projectId) return
      const next = title.trim()
      if (!next) throw new Error("Enter a name.")
      await this.library.updateChat(this.projectId, chatId, {
        title: next.slice(0, 80),
        titleCustom: true,
        named: true,
      })
      this.runtimeFor(this.projectId, chatId)?.lockTitle()
      this.publishLibrary()
    })
  }

  async readTranscript(chatId: string): Promise<ChatMessage[]> {
    if (!this.projectId) throw new Error("Choose a folder first.")
    const live = this.runtimeFor(this.projectId, chatId)
    if (live) return live.messages
    return this.library.readTranscript(this.projectId, chatId)
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.run(async () => {
      if (!this.projectId) return
      await this.disposeChat(this.projectId, chatId)
      await this.library.deleteChat(this.projectId, chatId)
      if (this.chatId === chatId) this.chatId = null
      this.publishAll()
    })
  }

  async removeProject(projectId: string, typedName: string): Promise<void> {
    await this.run(async () => {
      const project = this.library.project(projectId)
      if (!project) return
      if (project.name !== typedName) throw new Error("Type the folder name to delete it.")
      const doomed: ChatRuntime[] = []
      for (const runtime of this.runtimes.values()) {
        if (runtime.projectId === projectId) doomed.push(runtime)
      }
      for (const runtime of doomed) {
        await runtime.abort()
        this.clearTimer(runtime.key)
        runtime.dispose()
        this.runtimes.delete(runtime.key)
      }
      await this.library.removeProject(projectId)
      this.extensionCache.delete(projectId)
      if (this.projectId !== projectId) {
        this.publishAll()
        return
      }
      this.projectId = null
      this.chatId = null
      this.cwd = ""
      const next = this.latestProject()
      if (!next) {
        await this.persistPrefs()
        this.publishAll()
        return
      }
      await this.openProjectUnlocked(next.id)
    })
  }

  async searchFiles(query: string) {
    if (!this.projectId) return []
    const project = this.library.project(this.projectId)
    if (!project) return []
    return searchProjectFiles(project.path, query)
  }

  async listCommands(): Promise<SlashCommand[]> {
    const runtime = this.openRuntime()
    if (runtime) return runtime.commands()
    if (!this.cwd) return []
    return draftCommands(this.cwd)
  }

  async setQueueMode(id: string, mode: QueueMode): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) return
    await runtime.setQueueMode(id, mode)
  }

  async editMessage(id: string, text: string): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.editMessage(id, text)
  }

  async setPlanMode(enabled: boolean): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) {
      this.draftPlanMode = enabled
      this.publishTranscript()
      return
    }
    runtime.setPlanMode(enabled)
  }

  async approvePlan(): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.approvePlan()
  }

  async rewind(id: string, mode: RewindMode): Promise<RewindResult> {
    const runtime = this.openRuntime()
    if (!runtime) throw new Error("Open a chat first.")
    return runtime.rewind(id, mode)
  }

  async undoRewind(commit: string): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.undoRewind(commit)
  }

  gitStatus(): Promise<GitStatus> {
    return gitStatus(this.requireCwd())
  }

  async gitDiff(scope: DiffScope): Promise<string> {
    if (scope === "turn") return (await this.openRuntime()?.turnDiff()) ?? ""
    return gitDiff(this.requireCwd())
  }

  async gitCommit(message: string): Promise<string> {
    const text = message.trim()
    if (!text) throw new Error("Write a commit message.")
    return gitCommit(this.requireCwd(), text)
  }

  gitPush(): Promise<void> {
    return gitPush(this.requireCwd())
  }

  gitPullRequest(): Promise<string> {
    return createPullRequest(this.requireCwd())
  }

  async gitCommitMessage(): Promise<string> {
    const diff = await gitDiff(this.requireCwd())
    if (!diff.trim()) throw new Error("There are no changes to commit.")
    const runtime = this.modelRuntime
    const model = this.titleModel(this.openRuntime()?.modelId ?? this.draftModelId ?? "")
    if (!runtime || !model) throw new Error("No model is available.")
    return generateCommitMessage(runtime, model, diff)
  }

  private requireCwd(): string {
    if (!this.cwd) throw new Error("Choose a folder first.")
    return this.cwd
  }

  removeQueued(id: string): void {
    this.openRuntime()?.removeQueued(id)
  }

  async compact(): Promise<void> {
    const runtime = this.openRuntime()
    if (!runtime) return
    await runtime.compact()
  }

  async setModel(modelId: string): Promise<ModelChange> {
    const runtimeModel = this.modelRuntime
    if (!runtimeModel) throw new Error("Pi is not ready.")
    const model = runtimeModel.getModel(PROVIDER, modelId)
    if (!model || model.id.includes(":batch")) throw new Error("That model is not available.")
    this.draftModelId = model.id
    this.draftModelName = model.name
    await this.persistPrefs()
    const runtime = this.openRuntime()
    if (!runtime) {
      this.publishMeta()
      return { applied: true }
    }
    const applied = await runtime.setModel(model)
    if (applied) {
      await this.library.updateChat(runtime.projectId, runtime.chatId, { modelId: model.id })
      this.publishMeta()
      return { applied: true }
    }
    this.publishMeta()
    return { applied: false }
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
    this.applyDraftModel()
    this.publishMeta()
  }

  async logoutOpenRouter(): Promise<void> {
    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")
    await runtime.logout(PROVIDER, { signal: AbortSignal.timeout(20_000) })
    this.openRouter = await this.readAuth()
    this.publishMeta()
  }

  async flush(): Promise<void> {
    const writes: Promise<void>[] = []
    for (const [key, timer] of this.timers) {
      clearTimeout(timer)
      if (key.startsWith("usage:")) writes.push(this.library.saveProject(key.slice("usage:".length)))
    }
    this.timers.clear()
    for (const runtime of this.runtimes.values()) {
      writes.push(this.library.writeTranscript(runtime.projectId, runtime.chatId, runtime.messages))
    }
    await Promise.all(writes)
  }

  close(): void {
    for (const runtime of this.runtimes.values()) runtime.dispose()
    this.runtimes.clear()
  }

  private async openProjectUnlocked(projectId: string): Promise<void> {
    const project = this.library.project(projectId)
    if (!project) throw new Error("That project is gone.")
    try {
      await assertDirectory(project.path)
    } catch {
      throw new Error("That folder is missing.")
    }
    this.projectId = project.id
    this.cwd = project.path
    await this.persistPrefs()
    const chatId = project.openChatId
    if (chatId && this.library.chat(project.id, chatId)) {
      await this.loadChat(project.id, chatId)
    } else {
      this.chatId = null
      await this.library.touchProject(project.id, null)
    }
    this.publishAll()
  }

  private async ensureRuntime(): Promise<ChatRuntime> {
    if (!this.projectId) throw new Error("Choose a folder first.")
    if (!this.openRouter.configured) throw new Error("Add an OpenRouter API key in settings.")
    if (this.chatId) {
      const existing = this.runtimeFor(this.projectId, this.chatId)
      if (existing) return existing
      await this.loadChat(this.projectId, this.chatId)
      const loaded = this.runtimeFor(this.projectId, this.chatId)
      if (!loaded) throw new Error("The session is not ready.")
      return loaded
    }
    const model = this.selectModel(null)
    const chat = await this.library.createChat(this.projectId, model?.id ?? this.draftModelId)
    this.chatId = chat.id
    await this.loadChat(this.projectId, chat.id)
    const created = this.runtimeFor(this.projectId, chat.id)
    if (!created) throw new Error("The session is not ready.")
    if (this.draftPlanMode) created.setPlanMode(true)
    this.draftPlanMode = false
    this.publishLibrary()
    return created
  }

  private async loadChat(projectId: string, chatId: string): Promise<void> {
    const project = this.library.project(projectId)
    const chat = this.library.chat(projectId, chatId)
    if (!project || !chat) throw new Error("That chat is gone.")
    this.projectId = projectId
    this.chatId = chatId
    this.cwd = project.path
    await this.library.touchProject(projectId, chatId)
    if (chat.unread) await this.library.updateChat(projectId, chatId, { unread: false })
    const existing = this.runtimeFor(projectId, chatId)
    if (existing) return
    const runtimeModel = this.modelRuntime
    if (!runtimeModel) throw new Error("Pi is not ready.")
    const model = this.selectModel(chat.modelId)
    if (!model) throw new Error("No OpenRouter models are available.")
    const messages = await this.library.readTranscript(projectId, chatId)
    const runtime = new ChatRuntime({
      projectId,
      chatId,
      cwd: project.path,
      sessionDir: this.library.sessionDir(projectId),
      checkpointDir: this.library.checkpointDir(projectId),
      sessionFile: chat.sessionFile,
      model,
      named: chat.named || chat.titleCustom,
      titleGenerated: chat.titleCustom || (chat.titleGenerated ?? chat.named),
      computer: this.computer,
      gate: this.gate,
      modelRuntime: runtimeModel,
      onChange: (runningChanged) => {
        this.onRuntimeChange(runtime, runningChanged)
      },
      onExtensions: (extensions, errors) => {
        this.extensionCache.set(projectId, { extensions, errors })
        if (this.projectId === projectId) this.publishMeta()
      },
      onTitle: (title, generated) => {
        const current = this.library.chat(projectId, chatId)
        if (generated && current?.titleCustom) return
        const patch: Partial<StoredChat> = { title, named: true, updatedAt: Date.now() }
        if (generated) patch.titleGenerated = true
        void this.library.updateChat(projectId, chatId, patch).then(() => this.publishLibrary())
      },
      generateTitle: (user, assistant) => {
        const titleModel = this.titleModel(runtime.modelId)
        if (!titleModel) return Promise.resolve(null)
        return generateTitle(runtimeModel, titleModel, user, assistant)
      },
      onModel: (modelId) => {
        void this.library.updateChat(projectId, chatId, { modelId }).then(() => {
          if (this.projectId === projectId && this.chatId === chatId) this.publishMeta()
        })
      },
      onUsage: (usage) => {
        const stored = this.library.chat(projectId, chatId)
        if (!stored) return
        if (stored.tokens === usage.totalTokens && stored.cost === usage.cost) return
        stored.tokens = usage.totalTokens
        stored.cost = usage.cost
        this.scheduleUsageSave(projectId)
      },
      onSettled: () => {
        const open = this.projectId === projectId && this.chatId === chatId
        if (!open || !this.notifier.focused()) {
          let body = "Finished"
          if (runtime.waiting) body = "A plan is ready for review"
          else if (runtime.failed) body = "Stopped with an error"
          this.notify(projectId, chatId, body)
        }
        if (open) return
        void this.library.updateChat(projectId, chatId, { unread: true }).then(() => this.publishLibrary())
      },
      onTaskFinished: (task) => {
        let body = `${task.label} finished`
        if (task.status === "failed") body = `${task.label} exited with code ${task.exitCode ?? "unknown"}`
        this.notify(projectId, chatId, body)
      },
      saveBytes: (name, mimeType, bytes) => this.saveBytes(projectId, chatId, name, mimeType, bytes),
    })
    runtime.load(messages)
    try {
      const sessionFile = await runtime.open()
      this.runtimes.set(runtime.key, runtime)
      if (sessionFile && sessionFile !== chat.sessionFile) {
        await this.library.updateChat(projectId, chatId, { sessionFile })
      }
    } catch (error) {
      runtime.dispose()
      throw error
    }
  }

  private async disposeChat(projectId: string, chatId: string): Promise<void> {
    const runtime = this.runtimeFor(projectId, chatId)
    if (!runtime) return
    await runtime.abort()
    runtime.dispose()
    this.clearTimer(runtime.key)
    await this.library.writeTranscript(projectId, chatId, runtime.messages)
    this.runtimes.delete(runtime.key)
  }

  private onRuntimeChange(runtime: ChatRuntime, runningChanged: boolean): void {
    this.scheduleTranscript(runtime)
    if (runningChanged) this.publishLibrary()
    if (runtime.projectId === this.projectId && runtime.chatId === this.chatId) this.publishTranscript()
  }

  private scheduleTranscript(runtime: ChatRuntime): void {
    this.clearTimer(runtime.key)
    this.timers.set(
      runtime.key,
      setTimeout(() => {
        this.timers.delete(runtime.key)
        void this.library.writeTranscript(runtime.projectId, runtime.chatId, runtime.messages)
      }, 200),
    )
  }

  // Usage changes on every reply, so the project file is written at most once
  // a second and the totals in meta follow it.
  private scheduleUsageSave(projectId: string): void {
    const key = `usage:${projectId}`
    if (this.timers.has(key)) return
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        void this.library.saveProject(projectId).then(() => this.publishMeta())
      }, 1000),
    )
  }

  private notify(projectId: string, chatId: string, body: string): void {
    const chat = this.library.chat(projectId, chatId)
    const project = this.library.project(projectId)
    let title = chat?.title ?? "slagent"
    if (project) title = `${title} · ${project.name}`
    this.notifier.notify({ title, body, projectId, chatId })
  }

  async taskOutput(id: string): Promise<string> {
    return this.openRuntime()?.taskOutput(id) ?? ""
  }

  async stopTask(id: string): Promise<void> {
    this.openRuntime()?.stopTask(id)
  }

  private usageTotals(): UsageTotals {
    const totals: UsageTotals = { tokens: 0, cost: 0, chats: 0 }
    for (const project of this.library.projects()) {
      for (const chat of this.library.projectChats(project.id)) {
        if (!chat.tokens && !chat.cost) continue
        totals.tokens += chat.tokens ?? 0
        totals.cost += chat.cost ?? 0
        totals.chats += 1
      }
    }
    return totals
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key)
    if (!timer) return
    clearTimeout(timer)
    this.timers.delete(key)
  }

  private async saveBytes(projectId: string, chatId: string, name: string, mimeType: string, bytes: Buffer) {
    const dir = this.library.attachmentDir(projectId, chatId)
    await mkdir(dir, { recursive: true })
    let safe = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "file"
    if (!safe.includes(".")) safe = `${safe}${extensionForMime(mimeType)}`
    const file = `${randomUUID()}-${safe}`
    await writeFile(join(dir, file), bytes)
    return {
      url: this.library.attachmentUrl(projectId, chatId, file),
      path: join(dir, file),
    }
  }

  private async initialProject() {
    const openId = this.library.openProjectId
    if (openId) {
      const project = this.library.project(openId)
      if (project && (await directoryExists(project.path))) return project
    }
    if (!this.prefs.cwd) return null
    try {
      return await this.library.ensureProject(this.prefs.cwd)
    } catch {
      return null
    }
  }

  private latestProject() {
    const projects = this.library.projects()
    let latest = projects[0]
    if (!latest) return null
    for (const project of projects) {
      if (project.lastOpenedAt > latest.lastOpenedAt) latest = project
    }
    return latest
  }

  private openRuntime(): ChatRuntime | null {
    if (!this.projectId || !this.chatId) return null
    return this.runtimeFor(this.projectId, this.chatId)
  }

  private runtimeFor(projectId: string, chatId: string): ChatRuntime | null {
    return this.runtimes.get(`${projectId}:${chatId}`) ?? null
  }

  private applyDraftModel(): void {
    const model = this.selectModel(this.draftModelId)
    if (!model) return
    this.draftModelId = model.id
    this.draftModelName = model.name
  }

  private selectModel(preferred: string | null): AgentModel | undefined {
    const runtime = this.modelRuntime
    if (!runtime) return undefined
    const ids = [preferred, this.draftModelId, ...PREFERRED_MODELS]
    for (const id of ids) {
      if (!id) continue
      const model = runtime.getModel(PROVIDER, id)
      if (model && !model.id.includes(":batch")) return model
    }
    const first = this.models[0]
    if (!first) return undefined
    return runtime.getModel(PROVIDER, first.id)
  }

  private titleModel(fallbackId: string): AgentModel | undefined {
    const runtime = this.modelRuntime
    if (!runtime) return undefined
    for (const id of [...TITLE_MODELS, fallbackId]) {
      const model = runtime.getModel(PROVIDER, id)
      if (model) return model
    }
    return undefined
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

  private async persistPrefs(): Promise<void> {
    this.prefs = { cwd: this.cwd || undefined, modelId: this.draftModelId ?? undefined }
    await writePrefs(this.prefsPath, this.prefs)
  }

  private viewModel(): { id: string | null; name: string | null } {
    const runtime = this.openRuntime()
    if (runtime) return { id: runtime.modelId, name: runtime.modelName }
    return { id: this.draftModelId, name: this.draftModelName }
  }

  private buildMeta(): AppMeta {
    const model = this.viewModel()
    const cached = this.projectId ? this.extensionCache.get(this.projectId) : undefined
    return {
      ready: this.ready,
      error: this.startupError,
      cwd: this.cwd,
      agentDir: this.agentDir,
      modelId: model.id,
      modelName: model.name,
      models: this.models,
      openRouter: this.openRouter,
      extensions: cached?.extensions ?? [],
      extensionErrors: cached?.errors ?? [],
      usageTotals: this.usageTotals(),
    }
  }

  private libraryState(): LibraryState {
    const projects: ProjectSummary[] = this.library.projects().map((project) => ({
      id: project.id,
      path: project.path,
      name: project.name,
      pinned: project.pinned,
      pinnedAt: project.pinnedAt,
      lastOpenedAt: project.lastOpenedAt,
      running: this.projectRunning(project.id),
      attention: this.projectAttention(project.id),
    }))
    let chats: ChatSummary[] = []
    if (this.projectId) chats = this.library.projectChats(this.projectId).map((chat) => this.chatSummary(chat))
    return {
      projects,
      openProjectId: this.projectId,
      chats,
      openChatId: this.chatId,
    }
  }

  private chatSummary(chat: StoredChat): ChatSummary {
    const runtime = this.projectId ? this.runtimeFor(this.projectId, chat.id) : null
    return {
      id: chat.id,
      title: chat.title,
      pinned: chat.pinned,
      pinnedAt: chat.pinnedAt,
      updatedAt: chat.updatedAt,
      running: runtime?.running ?? false,
      status: this.chatStatus(chat, runtime),
    }
  }

  private chatStatus(chat: StoredChat, runtime: ChatRuntime | null): ChatStatus {
    if (runtime?.waiting) return "waiting"
    if (runtime?.running) return "running"
    if (runtime?.failed) return "error"
    if (chat.unread) return "unread"
    return "idle"
  }

  private projectAttention(projectId: string): boolean {
    if (projectId === this.projectId) return false
    for (const chat of this.library.projectChats(projectId)) {
      if (chat.unread) return true
      if (this.runtimeFor(projectId, chat.id)?.waiting) return true
    }
    return false
  }

  private projectRunning(projectId: string): boolean {
    for (const runtime of this.runtimes.values()) {
      if (runtime.projectId !== projectId) continue
      if (runtime.running) return true
    }
    return false
  }

  private transcriptState(): TranscriptState {
    const runtime = this.openRuntime()
    if (!runtime) {
      return {
        messages: [],
        streaming: false,
        notice: null,
        queue: [],
        usage: null,
        todos: [],
        planMode: this.draftPlanMode,
        planProposal: null,
        tasks: [],
      }
    }
    return runtime.transcript()
  }

  private publishAll(): void {
    this.publishMeta()
    this.publishLibrary()
    this.publishTranscript()
  }

  private publishMeta(): void {
    this.revision += 1
    this.emit({ type: "meta", revision: this.revision, meta: this.buildMeta() })
  }

  private publishLibrary(): void {
    let unread = 0
    for (const project of this.library.projects()) {
      for (const chat of this.library.projectChats(project.id)) if (chat.unread) unread += 1
    }
    this.notifier.badge(unread)
    this.revision += 1
    this.emit({ type: "library", revision: this.revision, library: this.libraryState() })
  }

  private publishTranscript(): void {
    this.revision += 1
    this.emit({
      type: "transcript",
      revision: this.revision,
      projectId: this.projectId,
      chatId: this.chatId,
      ...this.transcriptState(),
    })
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task)
    this.tail = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg"
  if (mimeType === "image/png") return ".png"
  if (mimeType === "image/gif") return ".gif"
  if (mimeType === "image/webp") return ".webp"
  if (mimeType === "application/pdf") return ".pdf"
  return ""
}

async function directoryExists(folder: string): Promise<boolean> {
  try {
    const info = await stat(folder)
    return info.isDirectory()
  } catch {
    return false
  }
}
