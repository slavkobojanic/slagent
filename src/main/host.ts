import { randomUUID } from "node:crypto"
import { watch, type FSWatcher } from "node:fs"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { dialog } from "electron"
import {
  getAgentDir,
  ModelRuntime as ModelRuntimeClass,
  type McpServerConfig,
  type ModelRuntime,
} from "@earendil-works/pi-coding-agent"
import type {
  AppMeta,
  ChatMessage,
  ChatSearchResult,
  CreateSkillInput,
  DiffScope,
  DraftSkillInput,
  GitStatus,
  ChatStatus,
  ChatSummary,
  ExtensionInfo,
  EffortLevel,
  LibraryState,
  ModelChange,
  ModelRouting,
  OpenRouterStatus,
  Personalisation,
  PinnedFile,
  ProjectAppearance,
  ProjectSummary,
  PromptRequest,
  QuestionReply,
  QueueMode,
  RewindMode,
  RewindResult,
  SkillDraft,
  SlashCommand,
  ServerInfo,
  Snapshot,
  TranscriptPage,
  TranscriptState,
  TaskEntry,
  UiEvent,
  UsageStats,
  UsageTotals,
} from "../shared/types"
import { EMPTY_PERSONALISATION } from "../shared/types"
import { ChatRuntime, type AgentModel } from "./chat-runtime"
import type { TaskTerminalSpawner } from "./extensions/background-tasks"
import { CLAUDE_MODELS, ClaudeRuntime, claudeModel, isClaudeModel } from "./claude-runtime"
import type { ComputerUse } from "./computer"
import { draftCommands } from "./commands"
import { searchChats } from "./search"
import { ComputerGate } from "./computer-gate"
import { searchProjectFiles } from "./files"
import { errorMessage } from "./format"
import { assertDirectory, Library, type StoredChat } from "./library"
import { PROJECT_COLORS, PROJECT_ICONS } from "../shared/project-appearance"
import { parseEffort, parsePersonalisation, parseRouting, readPrefs, writePrefs, type Prefs } from "./prefs"
import { routeModel } from "./routing"
import { DEFAULT_TITLE_MODEL, generateCommitMessage, generateTitle, isTitleModel, parseTitleModelId, TITLE_MODELS } from "./titles"
import { createSkillFile, draftSkill } from "./skills-create"
import { createPullRequest, gitCommit, gitDiff, gitPush, gitStatus } from "./git"
import { importShellEnv } from "./shell-env"
import { runUsageBackfill } from "./usage-backfill"
import { UsageLedger } from "./usage-ledger"
import { newerWindow, olderWindow, sliceWindow, tailWindow, windowAround, type TranscriptWindow } from "./transcript-window"

const PROVIDER = "openrouter"
const TRANSCRIPT_PUBLISH_MS = 33
const GIT_PUBLISH_MS = 200
const PREFERRED_MODELS = [
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.4",
]

type Emit = (clientId: string | null, event: UiEvent) => void

type Runtime = ChatRuntime | ClaudeRuntime

// Everything a connected client sees on its own: its open project and chat,
// and where it has scrolled the transcript. Library, meta and settings are
// global; every publish projects them through the client's session.
type Session = {
  clientId: string
  projectId: string | null
  chatId: string | null
  cwd: string
  window: { chatId: string | null; bounds: TranscriptWindow }
}

export type Notifier = {
  // Whether a focused window is looking at this chat, so finished runs in it
  // are seen and no notification is needed.
  focused: (projectId: string, chatId: string) => boolean
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
  private readonly usage: UsageLedger
  private readonly gate = new ComputerGate()
  private readonly runtimes = new Map<string, Runtime>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  // Message counts per runtime, so each new message can bump the chat's
  // updatedAt for the sidebar ordering.
  private readonly messageCounts = new Map<string, number>()
  // Projects whose chats moved and still need the project file rewritten.
  private readonly dirtyProjects = new Set<string>()
  private readonly extensionCache = new Map<string, ExtensionCache>()
  // One .git/HEAD watcher per session, for the branch label under its open chat.
  private readonly gitWatchers = new Map<string, { watcher: FSWatcher; head: string }>()
  private prefs: Prefs = {}
  private personalisation: Personalisation = { ...EMPTY_PERSONALISATION }
  private readonly sessions = new Map<string, Session>()
  // The cwd of the last opened chat, saved to prefs and used for new terminals.
  private cwd = ""
  private agentDir = getAgentDir()
  private draftModelId: string | null = null
  private draftModelName: string | null = null
  private titleModelId = DEFAULT_TITLE_MODEL
  private routing: ModelRouting = "balance"
  private effort: EffortLevel = "medium"
  private draftPlanMode = false
  private models: AppMeta["models"] = []
  private openRouter: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }
  private ready = false
  private startupError: string | null = null
  // Clients drop events older than the newest revision they have seen, and a
  // phone outlives the process serving it (app and daemon hand over), so the
  // count starts from the clock: a later process always starts above an
  // earlier one, unless that one averaged over a thousand events a millisecond.
  private revision = Date.now() * 1000
  private tail: Promise<void> = Promise.resolve()

  constructor(
    private readonly prefsPath: string,
    libraryRoot: string,
    private readonly emit: Emit,
    private readonly computer: ComputerUse,
    private readonly notifier: Notifier,
    private readonly getMcpServers: () => Record<string, McpServerConfig>,
    private readonly getServerInfo: () => ServerInfo | null,
    // Background task terminals live with the user's terminals, so the host
    // reads them through a getter: the manager is built after the host.
    private readonly getTerminalTasks: () => TaskTerminalSpawner | null,
  ) {
    this.library = new Library(libraryRoot)
    this.usage = new UsageLedger(join(libraryRoot, "usage.db"))
  }

  getCwd(): string {
    if (this.cwd) return this.cwd
    return this.prefs.cwd ?? ""
  }

  // A connected client gets a session and, like every new window, starts on
  // the last opened project.
  attach(clientId: string): void {
    const session: Session = { clientId, projectId: null, chatId: null, cwd: "", window: { chatId: null, bounds: tailWindow } }
    this.sessions.set(clientId, session)
    void this.run(async () => {
      const initial = await this.initialProject()
      if (initial) await this.openProjectUnlocked(session, initial.id)
    }).catch((error) => console.error("initial project:", error))
  }

  // Something outside the host's own state changed, like the server's address.
  refreshMeta(): void {
    this.publishMeta(null)
  }

  detach(clientId: string): void {
    this.closeSessionGitWatcher(clientId)
    this.sessions.delete(clientId)
  }

  // Whether this client's window is looking at the chat, so a finished run in
  // it is already on screen and needs no notification.
  isViewedBy(clientId: string, projectId: string, chatId: string): boolean {
    const session = this.sessions.get(clientId)
    return Boolean(session && session.projectId === projectId && session.chatId === chatId)
  }

  getSnapshot(clientId: string): Snapshot {
    const session = this.requireSession(clientId)
    return {
      revision: this.revision,
      meta: this.buildMeta(session),
      library: this.libraryState(session),
      ...this.transcriptState(session),
    }
  }

  async start(): Promise<void> {
    try {
      this.prefs = await readPrefs(this.prefsPath)
      this.draftModelId = this.prefs.modelId ?? null
      this.titleModelId = parseTitleModelId(this.prefs.titleModelId)
      this.routing = this.prefs.routing ?? "balance"
      this.effort = parseEffort(this.prefs.effort)
      this.personalisation = this.prefs.personalisation ?? { ...EMPTY_PERSONALISATION }
      await this.library.load()
      void runUsageBackfill({ ledger: this.usage, library: this.library }).catch((error) => console.error("usage backfill:", error))
      void this.library.indexMissingChats().catch((error) => console.error("search index:", error))
      await importShellEnv("OPENROUTER_API_KEY")
      this.modelRuntime = await ModelRuntimeClass.create({ refreshOnCreate: false })
      this.models = this.catalog()
      this.openRouter = await this.readAuth()
      this.applyDraftModel()
    } catch (error) {
      this.startupError = errorMessage(error)
    } finally {
      this.ready = true
      this.publishMeta(null)
    }
  }

  async prompt(clientId: string, request: PromptRequest): Promise<void> {
    const session = this.requireSession(clientId)
    const runtime = await this.run(() => this.ensureRuntime(session))
    if (this.windowBounds(session) !== tailWindow) {
      session.window = { chatId: session.chatId, bounds: tailWindow }
      this.publishTranscriptTo(session)
    }
    await runtime.prompt(request)
  }

  async abort(clientId: string): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) return
    await runtime.abort()
  }

  // Starts a draft in the target project, which becomes the active one when it is not already.
  // The draft is the project's last thread until a chat is opened in it.
  async newChat(clientId: string, projectId?: string): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(async () => {
      const target = projectId ?? session.projectId
      if (!target) throw new Error("Choose a folder first.")
      const project = this.library.project(target)
      if (!project) throw new Error("That project is gone.")
      const switching = target !== session.projectId
      if (switching) {
        if (project.mode === "chat") {
          await mkdir(project.path, { recursive: true })
        } else {
          try {
            await assertDirectory(project.path)
          } catch {
            throw new Error("That folder is missing.")
          }
        }
      }
      session.projectId = target
      session.cwd = project.path
      this.cwd = project.path
      session.chatId = null
      await this.library.touchProject(target, null)
      if (switching) {
        await this.persistPrefs()
        this.publishAllTo(session)
        return
      }
      this.publishLibrary(null)
      this.publishTranscriptTo(session)
    })
  }

  async openFolder(clientId: string, folder: string): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(async () => {
      const project = await this.library.ensureProject(folder)
      await this.openProjectUnlocked(session, project.id)
    })
  }

  async createChatProject(clientId: string): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(async () => {
      const project = await this.library.ensureChatProject()
      // "New" starts a draft: the chat project's last chat is not resumed.
      await this.openProjectUnlocked(session, project.id, false)
    })
  }

  async openProject(clientId: string, projectId: string): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(() => this.openProjectUnlocked(session, projectId))
  }

  async openChat(clientId: string, chatId: string, projectId?: string, messageId?: string): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(async () => {
      const target = projectId ?? session.projectId
      if (!target) throw new Error("Choose a folder first.")
      if (target !== session.projectId) {
        const project = this.library.project(target)
        if (!project) throw new Error("That project is gone.")
        try {
          await assertDirectory(project.path)
        } catch {
          throw new Error("That folder is missing.")
        }
        await this.loadChat(session, target, chatId)
        await this.persistPrefs()
      } else {
        await this.loadChat(session, target, chatId)
      }
      let bounds = tailWindow
      const runtime = this.sessionRuntime(session)
      if (messageId && runtime) bounds = windowAround(runtime.messages, messageId) ?? tailWindow
      session.window = { chatId, bounds }
      this.publishAllTo(session)
    })
  }

  async pageTranscript(clientId: string, page: TranscriptPage): Promise<void> {
    const session = this.requireSession(clientId)
    await this.run(async () => {
      const runtime = this.sessionRuntime(session)
      if (!runtime) return
      let bounds = tailWindow
      if (page === "older") bounds = olderWindow(runtime.messages, this.windowBounds(session))
      if (page === "newer") bounds = newerWindow(runtime.messages, this.windowBounds(session))
      session.window = { chatId: session.chatId, bounds }
      this.publishTranscriptTo(session)
    })
  }

  async searchChats(query: string): Promise<ChatSearchResult[]> {
    return searchChats(this.library, query)
  }

  async pinProject(_clientId: string, projectId: string, pinned: boolean): Promise<void> {
    await this.run(async () => {
      await this.library.setPinned(projectId, pinned)
      this.publishLibrary(null)
    })
  }

  async setProjectAppearance(_clientId: string, projectId: string, appearance: ProjectAppearance): Promise<void> {
    await this.run(async () => {
      if (appearance.icon !== null && !PROJECT_ICONS.some((icon) => icon.id === appearance.icon)) {
        throw new Error("Unknown icon.")
      }
      if (appearance.color !== null && !PROJECT_COLORS.some((color) => color.id === appearance.color)) {
        throw new Error("Unknown colour.")
      }
      await this.library.setAppearance(projectId, appearance.icon, appearance.color)
      this.publishLibrary(null)
    })
  }

  async pinChat(clientId: string, chatId: string, pinned: boolean, projectId?: string): Promise<void> {
    await this.run(async () => {
      const target = projectId ?? this.requireSession(clientId).projectId
      if (!target) return
      await this.library.setChatPinned(target, chatId, pinned)
      this.publishLibrary(null)
    })
  }

  async renameChat(clientId: string, chatId: string, title: string, projectId?: string): Promise<void> {
    await this.run(async () => {
      const target = projectId ?? this.requireSession(clientId).projectId
      if (!target) return
      const next = title.trim()
      if (!next) throw new Error("Enter a name.")
      await this.library.updateChat(target, chatId, {
        title: next.slice(0, 80),
        titleCustom: true,
        named: true,
      })
      this.runtimeFor(target, chatId)?.lockTitle()
      this.publishLibrary(null)
    })
  }

  async readTranscript(clientId: string, chatId: string, projectId?: string): Promise<ChatMessage[]> {
    const target = projectId ?? this.requireSession(clientId).projectId
    if (!target) throw new Error("Choose a folder first.")
    const live = this.runtimeFor(target, chatId)
    if (live) return live.messages
    return this.library.readTranscript(target, chatId)
  }

  async deleteChat(clientId: string, chatId: string, projectId?: string): Promise<void> {
    await this.run(async () => {
      const target = projectId ?? this.requireSession(clientId).projectId
      if (!target) return
      await this.disposeChat(target, chatId)
      await this.library.deleteChat(target, chatId)
      for (const other of this.sessions.values()) {
        if (other.chatId === chatId) other.chatId = null
      }
      this.publishLibrary(null)
      for (const other of this.sessions.values()) this.publishTranscriptTo(other)
    })
  }

  async removeProject(_clientId: string, projectId: string, typedName: string): Promise<void> {
    await this.run(async () => {
      const project = this.library.project(projectId)
      if (!project) return
      if (project.name !== typedName) throw new Error("Type the folder name to delete it.")
      const doomed: Runtime[] = []
      for (const runtime of this.runtimes.values()) {
        if (runtime.projectId === projectId) doomed.push(runtime)
      }
      for (const runtime of doomed) {
        await runtime.abort()
        this.clearTimer(runtime.key)
        this.messageCounts.delete(runtime.key)
        runtime.dispose()
        this.runtimes.delete(runtime.key)
      }
      this.dirtyProjects.delete(projectId)
      await this.library.removeProject(projectId)
      this.extensionCache.delete(projectId)
      if (![...this.sessions.values()].some((session) => session.projectId === projectId)) {
        this.publishLibrary(null)
        return
      }
      for (const session of [...this.sessions.values()]) {
        if (session.projectId !== projectId) continue
        session.projectId = null
        session.chatId = null
        session.cwd = ""
        session.window = { chatId: null, bounds: tailWindow }
        const next = this.latestProject()
        if (next) await this.openProjectUnlocked(session, next.id)
        else this.publishAllTo(session)
      }
    })
  }

  async searchFiles(clientId: string, query: string) {
    const session = this.requireSession(clientId)
    if (!session.cwd) return []
    return searchProjectFiles(session.cwd, query)
  }

  async listCommands(clientId: string): Promise<SlashCommand[]> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (runtime) return runtime.commands()
    const session = this.requireSession(clientId)
    if (!session.cwd) return []
    return draftCommands(session.cwd)
  }

  async setQueueMode(clientId: string, id: string, mode: QueueMode): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) return
    await runtime.setQueueMode(id, mode)
  }

  async editMessage(clientId: string, id: string, text: string): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.editMessage(id, text)
  }

  async setPlanMode(clientId: string, enabled: boolean): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) {
      this.draftPlanMode = enabled
      for (const session of this.sessions.values()) this.publishTranscriptTo(session)
      return
    }
    runtime.setPlanMode(enabled)
  }

  async approvePlan(clientId: string): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.approvePlan()
  }

  answerQuestion(clientId: string, id: string, reply: QuestionReply): void {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) throw new Error("Open a chat first.")
    runtime.answerQuestion(id, reply)
  }

  async rewind(clientId: string, id: string, mode: RewindMode): Promise<RewindResult> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) throw new Error("Open a chat first.")
    return runtime.rewind(id, mode)
  }

  async undoRewind(clientId: string, commit: string): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) throw new Error("Open a chat first.")
    await runtime.undoRewind(commit)
  }

  gitStatus(clientId: string): Promise<GitStatus> {
    return gitStatus(this.requireCwd(clientId))
  }

  async gitDiff(clientId: string, scope: DiffScope): Promise<string> {
    if (scope === "turn") return (await this.sessionRuntime(this.requireSession(clientId))?.turnDiff()) ?? ""
    return gitDiff(this.requireCwd(clientId))
  }

  async gitCommit(clientId: string, message: string): Promise<string> {
    const text = message.trim()
    if (!text) throw new Error("Write a commit message.")
    return gitCommit(this.requireCwd(clientId), text)
  }

  gitPush(clientId: string): Promise<void> {
    return gitPush(this.requireCwd(clientId))
  }

  gitPullRequest(clientId: string): Promise<string> {
    return createPullRequest(this.requireCwd(clientId))
  }

  async gitCommitMessage(clientId: string): Promise<string> {
    const diff = await gitDiff(this.requireCwd(clientId))
    if (!diff.trim()) throw new Error("There are no changes to commit.")
    const runtime = this.modelRuntime
    const model = this.titleModel(this.sessionRuntime(this.requireSession(clientId))?.modelId ?? this.draftModelId ?? "")
    if (!runtime || !model) throw new Error("No model is available.")
    return generateCommitMessage(runtime, model, diff)
  }

  // The built-in "#create-skill" flow: a hidden call drafts the skill, a second call writes it.
  async draftSkill(clientId: string, input: DraftSkillInput): Promise<SkillDraft> {
    if (typeof input.userText !== "string" || input.userText.trim() === "" || typeof input.assistantText !== "string" || input.assistantText.trim() === "") {
      throw new Error("The skill is drafted from the last exchange.")
    }
    const runtime = this.modelRuntime
    const model = this.titleModel(this.sessionRuntime(this.requireSession(clientId))?.modelId ?? this.draftModelId ?? "")
    if (!runtime || !model) throw new Error("No model is available.")
    return draftSkill(runtime, model, input)
  }

  async createSkill(clientId: string, input: CreateSkillInput): Promise<string> {
    if (input.location !== "user" && input.location !== "project") throw new Error("Unknown location.")
    const cwd = this.requireSession(clientId).cwd
    if (input.location === "project" && !cwd) throw new Error("Choose a folder first.")
    return createSkillFile(cwd, input)
  }

  // The branch shows beneath the chat, so .git/HEAD is watched and any change publishes a git
  // event to the session looking at that project.
  private watchGit(session: Session): void {
    const head = join(session.cwd, ".git", "HEAD")
    const existing = this.gitWatchers.get(session.clientId)
    if (existing && existing.head === head) {
      return
    }
    existing?.watcher.close()
    this.gitWatchers.delete(session.clientId)
    try {
      const watcher = watch(head, { persistent: false }, () => {
        const key = `git:${session.clientId}`
        if (this.timers.has(key)) return
        this.timers.set(
          key,
          setTimeout(() => {
            this.timers.delete(key)
            this.revision += 1
            this.emit(session.clientId, { type: "git", revision: this.revision })
          }, GIT_PUBLISH_MS),
        )
      })
      watcher.once("error", () => {
        // The folder or repo can disappear while open; the label just keeps its last value.
      })
      this.gitWatchers.set(session.clientId, { watcher, head })
    } catch {
      // Not a git repository: the branch line stays hidden.
    }
  }

  private closeSessionGitWatcher(clientId: string): void {
    this.gitWatchers.get(clientId)?.watcher.close()
    this.gitWatchers.delete(clientId)
  }

  private requireCwd(clientId: string): string {
    const session = this.requireSession(clientId)
    if (!session.cwd) throw new Error("Choose a folder first.")
    return session.cwd
  }

  removeQueued(clientId: string, id: string): void {
    this.sessionRuntime(this.requireSession(clientId))?.removeQueued(id)
  }

  async compact(clientId: string): Promise<void> {
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    if (!runtime) return
    await runtime.compact()
  }

  async setPersonalisation(value: Personalisation): Promise<void> {
    this.personalisation = parsePersonalisation(value)
    await this.persistPrefs()
    this.publishMeta(null)
  }

  async pickContextFiles(): Promise<PinnedFile[]> {
    // Read caps at 512KB per file; the settings UI enforces the pinning limits.
    const READ_LIMIT = 512 * 1024
    const result = await dialog.showOpenDialog({
      title: "Pin context files",
      properties: ["openFile", "multiSelections"],
    })
    if (result.canceled) return []
    const files: PinnedFile[] = []
    for (const path of result.filePaths) {
      const bytes = await readFile(path).catch(() => null)
      // Skip unreadable files and binaries (a NUL byte is not text).
      if (!bytes || bytes.length === 0 || bytes.includes(0)) continue
      files.push({ name: basename(path), content: bytes.toString("utf8").slice(0, READ_LIMIT) })
    }
    return files
  }

  async setModel(clientId: string, modelId: string): Promise<ModelChange> {
    const claude = claudeModel(modelId)
    let piModel: AgentModel | undefined
    if (!claude) {
      const runtimeModel = this.modelRuntime
      if (!runtimeModel) throw new Error("Pi is not ready.")
      const found = runtimeModel.getModel(PROVIDER, modelId)
      if (!found || found.id.includes(":batch")) throw new Error("That model is not available.")
      piModel = routeModel(found, this.routing)
    }
    const option = claude ?? piModel!
    this.draftModelId = option.id
    this.draftModelName = option.name
    await this.persistPrefs()
    const runtime = this.sessionRuntime(this.requireSession(clientId))
    // A chat stays on the provider it started with, so switching providers
    // starts a new chat.
    if (runtime && runtime instanceof ClaudeRuntime !== Boolean(claude)) {
      await this.newChat(clientId)
      this.publishMeta(null)
      return { applied: true }
    }
    if (!runtime) {
      this.publishMeta(null)
      return { applied: true }
    }
    const applied = runtime instanceof ClaudeRuntime ? await runtime.setModel(option.id) : await runtime.setModel(piModel!)
    if (applied) {
      await this.library.updateChat(runtime.projectId, runtime.chatId, { modelId: option.id })
      this.publishMeta(null)
      return { applied: true }
    }
    this.publishMeta(null)
    return { applied: false }
  }

  async setTitleModel(modelId: string): Promise<void> {
    if (!isTitleModel(modelId)) throw new Error("That model cannot name chats.")
    this.titleModelId = modelId
    await this.persistPrefs()
    this.publishMeta(null)
  }

  async setRouting(routing: ModelRouting): Promise<void> {
    if (parseRouting(routing) !== routing) throw new Error("Unknown routing preference.")
    this.routing = routing
    await this.persistPrefs()
    this.applyRouting()
    this.publishMeta(null)
  }

  async setEffort(effort: EffortLevel): Promise<void> {
    if (parseEffort(effort) !== effort) throw new Error("Unknown effort level.")
    this.effort = effort
    await this.persistPrefs()
    this.applyEffort()
    this.publishMeta(null)
  }

  // An effort change reaches the open chats at once. A running chat holds the
  // level until its run ends, when the runtime applies the pending one.
  private applyEffort(): void {
    for (const runtime of this.runtimes.values()) {
      if (runtime instanceof ChatRuntime) runtime.setEffort(this.effort)
      else if (runtime instanceof ClaudeRuntime) runtime.setEffort(this.effort)
    }
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
      this.publishMeta(null)
      if (!this.openRouter.configured) throw error
    }

    this.models = this.catalog()
    this.openRouter = await this.readAuth()
    this.applyDraftModel()
    this.publishMeta(null)
  }

  async logoutOpenRouter(): Promise<void> {
    const runtime = this.modelRuntime
    if (!runtime) throw new Error("Pi is not ready.")
    await runtime.logout(PROVIDER, { signal: AbortSignal.timeout(20_000) })
    this.openRouter = await this.readAuth()
    this.publishMeta(null)
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
    for (const projectId of this.dirtyProjects) {
      writes.push(this.library.saveProject(projectId))
    }
    this.dirtyProjects.clear()
    await Promise.all(writes)
  }

  close(): void {
    this.clearPublishTimers()
    for (const entry of this.gitWatchers.values()) entry.watcher.close()
    this.gitWatchers.clear()
    for (const runtime of this.runtimes.values()) runtime.dispose()
    this.runtimes.clear()
    this.messageCounts.clear()
  }

  private async openProjectUnlocked(session: Session, projectId: string, resume = true): Promise<void> {
    const project = this.library.project(projectId)
    if (!project) throw new Error("That project is gone.")
    if (project.mode === "chat") {
      // Chat projects own their directory; recreate it if it went missing.
      await mkdir(project.path, { recursive: true })
    } else {
      try {
        await assertDirectory(project.path)
      } catch {
        throw new Error("That folder is missing.")
      }
    }
    session.projectId = project.id
    session.cwd = project.path
    this.cwd = project.path
    this.watchGit(session)
    await this.persistPrefs()
    const chatId = resume ? project.openChatId : null
    if (chatId && this.library.chat(project.id, chatId)) {
      await this.loadChat(session, project.id, chatId)
    } else {
      session.chatId = null
      await this.library.touchProject(project.id, null)
    }
    this.publishAllTo(session)
  }

  private async ensureRuntime(session: Session): Promise<Runtime> {
    if (!session.projectId) throw new Error("Choose a folder first.")
    const modelId = session.chatId ? this.library.chat(session.projectId, session.chatId)?.modelId : this.draftModelId
    if (!isClaudeModel(modelId) && !this.openRouter.configured) throw new Error("Add an OpenRouter API key in settings.")
    if (session.chatId) {
      const existing = this.runtimeFor(session.projectId, session.chatId)
      if (existing) return existing
      await this.loadChat(session, session.projectId, session.chatId)
      const loaded = this.runtimeFor(session.projectId, session.chatId)
      if (!loaded) throw new Error("The session is not ready.")
      return loaded
    }
    let chatModelId = this.draftModelId
    if (!isClaudeModel(chatModelId)) chatModelId = this.selectModel(null)?.id ?? this.draftModelId
    const chat = await this.library.createChat(session.projectId, chatModelId)
    session.chatId = chat.id
    await this.loadChat(session, session.projectId, chat.id)
    const created = this.runtimeFor(session.projectId, chat.id)
    if (!created) throw new Error("The session is not ready.")
    if (this.draftPlanMode) created.setPlanMode(true)
    this.draftPlanMode = false
    this.publishLibrary(null)
    return created
  }

  private async loadChat(session: Session, projectId: string, chatId: string): Promise<void> {
    const project = this.library.project(projectId)
    const chat = this.library.chat(projectId, chatId)
    if (!project || !chat) throw new Error("That chat is gone.")
    session.projectId = projectId
    session.chatId = chatId
    session.cwd = project.path
    this.cwd = project.path
    this.watchGit(session)
    await this.library.touchProject(projectId, chatId)
    // Opening the chat is what clears the unseen-finished dot, for every client.
    if (chat.unread) {
      await this.library.updateChat(projectId, chatId, { unread: false })
      this.publishLibrary(null)
    }
    const existing = this.runtimeFor(projectId, chatId)
    if (existing) return
    if (isClaudeModel(chat.modelId)) {
      await this.loadClaudeChat(project.path, projectId, chat, project.mode)
      return
    }
    const runtimeModel = this.modelRuntime
    if (!runtimeModel) throw new Error("Pi is not ready.")
    const model = this.selectModel(chat.modelId)
    if (!model) throw new Error("No OpenRouter models are available.")
    const messages = await this.library.readTranscript(projectId, chatId)
    const runtime = new ChatRuntime({
      projectId,
      chatId,
      cwd: project.path,
      mode: project.mode,
      sessionDir: this.library.sessionDir(projectId),
      checkpointDir: this.library.checkpointDir(projectId),
      sessionFile: chat.sessionFile,
      model,
      effort: this.effort,
      named: chat.named || chat.titleCustom,
      titleGenerated: chat.titleCustom || (chat.titleGenerated ?? chat.named),
      computer: this.computer,
      gate: this.gate,
      modelRuntime: runtimeModel,
      mcpServers: this.getMcpServers(),
      library: this.library,
      personalisation: () => this.personalisation,
      onChange: (runningChanged) => {
        this.onRuntimeChange(runtime, runningChanged)
      },
      onExtensions: (extensions, errors) => {
        this.extensionCache.set(projectId, { extensions, errors })
        this.publishMetaForProject(projectId)
      },
      onTitle: (title, generated) => this.handleChatTitle(projectId, chatId, title, generated),
      generateTitle: (user) => {
        const titleModel = this.titleModel()
        if (!titleModel) return Promise.resolve(null)
        return generateTitle(runtimeModel, titleModel, user)
      },
      onModel: (modelId) => {
        void this.library.updateChat(projectId, chatId, { modelId }).then(() => this.publishMetaForChat(projectId, chatId))
      },
      onUsage: (usage) => {
        const stored = this.library.chat(projectId, chatId)
        if (!stored) return
        if (stored.tokens === usage.totalTokens && stored.cost === usage.cost) return
        stored.tokens = usage.totalTokens
        stored.cost = usage.cost
        this.scheduleUsageSave(projectId)
      },
      onUsageRecord: (record) => {
        this.usage.recordLive(chatId, projectId, record)
      },
      onSettled: () => {
        const open = this.isViewed(projectId, chatId)
        if (!open || !this.notifier.focused(projectId, chatId)) {
          let body = "Finished"
          if (runtime.waiting) body = "A plan is ready for review"
          else if (runtime.failed) body = "Stopped with an error"
          this.notify(projectId, chatId, body)
        }
        const patch: Partial<StoredChat> = {}
        if (!runtime.waiting && !runtime.failed) patch.finishedAt = Date.now()
        if (!open) patch.unread = true
        if (Object.keys(patch).length === 0) return
        void this.library.updateChat(projectId, chatId, patch).then(() => this.publishLibrary(null))
      },
      onTaskFinished: (task) => {
        let body = `${task.label} finished`
        if (task.status === "failed") body = `${task.label} exited with code ${task.exitCode ?? "unknown"}`
        this.notify(projectId, chatId, body)
      },
      taskTerminals: () => this.getTerminalTasks(),
      onTasksChanged: () => {
        // The task list rides the library event, which every client mirrors.
        this.publishLibrary(null)
      },
      onQuestion: (request) => {
        const open = this.isViewed(projectId, chatId)
        if (open && this.notifier.focused(projectId, chatId)) return
        const first = request.questions[0]?.question ?? "A question is waiting"
        this.notify(projectId, chatId, first)
      },
      planProposal: chat.planProposal ?? null,
      onPlanProposal: (plan) => this.savePlanProposal(projectId, chatId, plan),
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

  private async loadClaudeChat(cwd: string, projectId: string, chat: StoredChat, mode?: "chat"): Promise<void> {
    const chatId = chat.id
    const messages = await this.library.readTranscript(projectId, chatId)
    const runtime: ClaudeRuntime = new ClaudeRuntime({
      projectId,
      chatId,
      cwd,
      mode,
      sessionId: chat.claudeSessionId ?? null,
      modelId: chat.modelId ?? CLAUDE_MODELS[0]!.id,
      effort: this.effort,
      named: chat.named || chat.titleCustom,
      titleGenerated: chat.titleCustom || (chat.titleGenerated ?? chat.named),
      onChange: (runningChanged) => {
        this.onRuntimeChange(runtime, runningChanged)
      },
      onSession: (sessionId) => {
        void this.library.updateChat(projectId, chatId, { claudeSessionId: sessionId })
      },
      onTitle: (title, generated) => this.handleChatTitle(projectId, chatId, title, generated),
      personalisation: () => this.personalisation,
      // Titles come from a small OpenRouter model, so without a key the
      // first line of the message stays as the title.
      generateTitle: (user) => {
        const runtimeModel = this.modelRuntime
        const titleModel = this.titleModel()
        if (!runtimeModel || !titleModel || !this.openRouter.configured) return Promise.resolve(null)
        return generateTitle(runtimeModel, titleModel, user)
      },
      onModel: (modelId) => {
        void this.library.updateChat(projectId, chatId, { modelId }).then(() => this.publishMetaForChat(projectId, chatId))
      },
      onUsage: (usage) => {
        const stored = this.library.chat(projectId, chatId)
        if (!stored) return
        if (stored.tokens === usage.totalTokens && stored.cost === usage.cost) return
        stored.tokens = usage.totalTokens
        stored.cost = usage.cost
        this.scheduleUsageSave(projectId)
      },
      onModelUsage: (modelUsage, costed) => {
        this.usage.recordClaude(chatId, projectId, Date.now(), modelUsage, costed)
      },
      onSettled: () => {
        const open = this.isViewed(projectId, chatId)
        if (!open || !this.notifier.focused(projectId, chatId)) {
          let body = "Finished"
          if (runtime.waiting) body = "A plan is ready for review"
          else if (runtime.failed) body = "Stopped with an error"
          this.notify(projectId, chatId, body)
        }
        const patch: Partial<StoredChat> = {}
        if (!runtime.waiting && !runtime.failed) patch.finishedAt = Date.now()
        if (!open) patch.unread = true
        if (Object.keys(patch).length === 0) return
        void this.library.updateChat(projectId, chatId, patch).then(() => this.publishLibrary(null))
      },
      onQuestion: (request) => {
        const open = this.isViewed(projectId, chatId)
        if (open && this.notifier.focused(projectId, chatId)) return
        const first = request.questions[0]?.question ?? "A question is waiting"
        this.notify(projectId, chatId, first)
      },
      planProposal: chat.planProposal ?? null,
      onPlanProposal: (plan) => this.savePlanProposal(projectId, chatId, plan),
      saveBytes: (name, mimeType, bytes) => this.saveBytes(projectId, chatId, name, mimeType, bytes),
    })
    runtime.load(messages)
    this.runtimes.set(runtime.key, runtime)
  }

  // A plan survives a crash or restart, so the review card shows again on reopen.
  private savePlanProposal(projectId: string, chatId: string, plan: string | null): void {
    void this.library.updateChat(projectId, chatId, { planProposal: plan ?? undefined }).catch(() => undefined)
  }

  private async disposeChat(projectId: string, chatId: string): Promise<void> {
    const runtime = this.runtimeFor(projectId, chatId)
    if (!runtime) return
    await runtime.abort()
    runtime.dispose()
    this.clearTimer(runtime.key)
    this.messageCounts.delete(runtime.key)
    await this.library.writeTranscript(projectId, chatId, runtime.messages)
    if (this.dirtyProjects.has(projectId)) {
      this.dirtyProjects.delete(projectId)
      await this.library.saveProject(projectId)
    }
    this.runtimes.delete(runtime.key)
  }

  private onRuntimeChange(runtime: Runtime, runningChanged: boolean): void {
    if (this.touchOnNewMessages(runtime)) this.publishLibrary(null)
    this.scheduleTranscript(runtime)
    if (runningChanged) this.publishLibrary(null)
    if (runningChanged) {
      for (const session of this.viewersOf(runtime.projectId, runtime.chatId)) this.publishTranscriptTo(session)
    } else {
      this.publishTranscriptSoonFor(runtime.projectId, runtime.chatId)
    }
  }

  // Every streamed token changes the runtime, and each publish sends the whole transcript
  // window. Coalescing to one publish per frame per chat keeps long chats from flooding
  // the clients watching them.
  private publishTranscriptSoonFor(projectId: string, chatId: string): void {
    const key = `publish:${projectId}:${chatId}`
    if (this.timers.has(key)) return
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        for (const session of this.viewersOf(projectId, chatId)) this.publishTranscriptTo(session)
      }, TRANSCRIPT_PUBLISH_MS),
    )
  }

  // The sidebar orders chats by when the user last sent a message, so only
  // user messages bump updatedAt. Bumping on every appended message would let
  // the assistant turns of concurrently running chats fight over the top slot.
  // The first change after a runtime opens is only the loaded transcript, so
  // it just sets the baseline.
  private touchOnNewMessages(runtime: Runtime): boolean {
    const count = runtime.messages.reduce(
      (total, message) => (message.role === "user" ? total + 1 : total),
      0,
    )
    const baseline = this.messageCounts.get(runtime.key)
    this.messageCounts.set(runtime.key, count)
    if (baseline === undefined || count <= baseline) return false
    if (!this.library.touchChat(runtime.projectId, runtime.chatId, Date.now())) return false
    this.dirtyProjects.add(runtime.projectId)
    return true
  }

  private scheduleTranscript(runtime: Runtime): void {
    this.clearTimer(runtime.key)
    this.timers.set(
      runtime.key,
      setTimeout(() => {
        this.timers.delete(runtime.key)
        void this.library
          .writeTranscript(runtime.projectId, runtime.chatId, runtime.messages)
          .then(() => {
            if (!this.dirtyProjects.has(runtime.projectId)) return
            this.dirtyProjects.delete(runtime.projectId)
            return this.library.saveProject(runtime.projectId)
          })
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
        void this.library.saveProject(projectId).then(() => this.publishMeta(null))
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

  async taskOutput(_clientId: string, id: string): Promise<string> {
    // Task ids are unique across chats, so a status bar can read any chat's task.
    return this.runtimeWithTask(id)?.taskOutput(id) ?? ""
  }

  async stopTask(_clientId: string, id: string): Promise<void> {
    this.runtimeWithTask(id)?.stopTask(id)
  }

  async usageStats(): Promise<UsageStats> {
    return this.usage.stats()
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

  private runtimeFor(projectId: string, chatId: string): Runtime | null {
    return this.runtimes.get(`${projectId}:${chatId}`) ?? null
  }

  // The chat that owns a background task. The session's own chat is likeliest,
  // but the status bar serves tasks from every chat.
  private runtimeWithTask(id: string): Runtime | null {
    for (const runtime of this.runtimes.values()) {
      if (runtime.tasks.some((task) => task.id === id)) return runtime
    }
    return null
  }

  private applyDraftModel(): void {
    const claude = claudeModel(this.draftModelId)
    if (claude) {
      this.draftModelName = claude.name
      return
    }
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
      if (model && !model.id.includes(":batch")) return routeModel(model, this.routing)
    }
    const first = this.models[0]
    if (!first) return undefined
    const model = runtime.getModel(PROVIDER, first.id)
    return model ? routeModel(model, this.routing) : undefined
  }

  // A routing change reaches the open chats at once. A running chat holds the
  // model until the run ends, when ChatRuntime applies the pending one.
  private applyRouting(): void {
    const runtime = this.modelRuntime
    if (!runtime) return
    for (const chat of this.runtimes.values()) {
      if (!(chat instanceof ChatRuntime)) continue
      const model = runtime.getModel(PROVIDER, chat.modelId)
      if (!model) continue
      void chat.setModel(routeModel(model, this.routing))
    }
  }

  // The configured naming model first, then the rest of the cheap list. A
  // fallback id is only passed by callers that may spend the chat's own model
  // (commit messages); naming passes none, so it stays cheap.
  private titleModel(fallbackId = ""): AgentModel | undefined {
    const runtime = this.modelRuntime
    if (!runtime) return undefined
    for (const id of [this.titleModelId, ...TITLE_MODELS.map((model) => model.id), fallbackId]) {
      if (!id) continue
      const model = runtime.getModel(PROVIDER, id)
      if (model) return routeModel(model, this.routing)
    }
    return undefined
  }

  private catalog(): AppMeta["models"] {
    const runtime = this.modelRuntime
    if (!runtime) return CLAUDE_MODELS
    const models = runtime.getModels(PROVIDER)
    const options: AppMeta["models"] = []
    for (const model of models) {
      if (model.id.includes(":batch")) continue
      options.push({
        id: model.id,
        name: model.name,
        contextWindow: model.contextWindow,
        reasoning: model.reasoning,
        provider: "openrouter",
      })
    }
    options.sort((left, right) => left.name.localeCompare(right.name))
    return [...CLAUDE_MODELS, ...options]
  }

  private async readAuth(): Promise<OpenRouterStatus> {
    const envKey = Boolean(process.env.OPENROUTER_API_KEY)
    const runtime = this.modelRuntime
    if (!runtime) return { configured: false, source: null, type: null, envKey }
    const check = await runtime.checkAuth(PROVIDER, { signal: AbortSignal.timeout(15_000) })
    if (!check) return { configured: false, source: null, type: null, envKey }
    return {
      configured: true,
      source: check.source ?? null,
      type: check.type,
      envKey,
    }
  }

  private async persistPrefs(): Promise<void> {
    this.prefs = {
      cwd: this.cwd || undefined,
      modelId: this.draftModelId ?? undefined,
      titleModelId: this.titleModelId,
      routing: this.routing,
      effort: this.effort,
      personalisation: this.personalisation,
    }
    await writePrefs(this.prefsPath, this.prefs)
  }

  private viewModel(session: Session): { id: string | null; name: string | null } {
    const runtime = this.sessionRuntime(session)
    if (runtime) return { id: runtime.modelId, name: runtime.modelName }
    return { id: this.draftModelId, name: this.draftModelName }
  }

  private buildMeta(session: Session): AppMeta {
    const model = this.viewModel(session)
    const cached = session.projectId ? this.extensionCache.get(session.projectId) : undefined
    return {
      ready: this.ready,
      error: this.startupError,
      cwd: session.cwd,
      agentDir: this.agentDir,
      modelId: model.id,
      modelName: model.name,
      modelProvider: model.id ? (isClaudeModel(model.id) ? "claude-code" : "openrouter") : null,
      models: this.models,
      routing: this.routing,
      effort: this.effort,
      titleModelId: this.titleModelId,
      titleModels: TITLE_MODELS,
      openRouter: this.openRouter,
      extensions: cached?.extensions ?? [],
      extensionErrors: cached?.errors ?? [],
      usageTotals: this.usageTotals(),
      personalisation: this.personalisation,
      server: this.getServerInfo(),
    }
  }

  // Shared by both runtimes: stores the generated chat title and, for chat
  // projects, names the project from the first generated title (the same small
  // model call names both, so no extra request is made).
  private handleChatTitle(projectId: string, chatId: string, title: string, generated: boolean): void {
    const current = this.library.chat(projectId, chatId)
    if (generated && current?.titleCustom) return
    const patch: Partial<StoredChat> = { title, named: true, updatedAt: Date.now() }
    if (generated) patch.titleGenerated = true
    void this.library.updateChat(projectId, chatId, patch).then(() => {
      const project = this.library.project(projectId)
      if (project?.mode === "chat" && project.name === "New chat" && title !== "New chat") {
        void this.library.setProjectName(projectId, title).then(() => this.publishLibrary(null))
      } else {
        this.publishLibrary(null)
      }
    })
  }

  private libraryState(session: Session): LibraryState {
    const projects: ProjectSummary[] = this.library.projects().map((project) => ({
      id: project.id,
      path: project.path,
      name: project.name,
      mode: project.mode ?? "code",
      pinned: project.pinned,
      pinnedAt: project.pinnedAt,
      lastOpenedAt: project.lastOpenedAt,
      running: this.projectRunning(project.id),
      attention: this.projectAttention(project.id),
      icon: project.icon,
      color: project.color,
    }))
    let chats: ChatSummary[] = []
    const chatsByProject: Record<string, ChatSummary[]> = {}
    if (session.projectId) {
      const projectId = session.projectId
      chats = this.library.projectChats(projectId).map((chat) => this.chatSummary(projectId, chat))
    }
    for (const project of projects) {
      if (project.id === session.projectId) continue
      const chatsOfProject = this.library.projectChats(project.id)
      if (chatsOfProject.length > 0) chatsByProject[project.id] = chatsOfProject.map((chat) => this.chatSummary(project.id, chat))
    }
    return {
      projects,
      openProjectId: session.projectId,
      chats,
      chatsByProject,
      openChatId: session.chatId,
      tasks: this.taskEntries(),
    }
  }

  // Every chat's background tasks, so the status bar shows them all, not just
  // the open chat's.
  private taskEntries(): TaskEntry[] {
    const entries: TaskEntry[] = []
    for (const runtime of this.runtimes.values()) {
      for (const task of runtime.tasks) {
        entries.push({ ...task, projectId: runtime.projectId })
      }
    }
    return entries.sort((left, right) => right.startedAt - left.startedAt)
  }

  private chatSummary(projectId: string, chat: StoredChat): ChatSummary {
    const runtime = this.runtimeFor(projectId, chat.id)
    return {
      id: chat.id,
      title: chat.title,
      pinned: chat.pinned,
      pinnedAt: chat.pinnedAt,
      updatedAt: chat.updatedAt,
      running: runtime?.running ?? false,
      status: this.chatStatus(chat, runtime),
      finishedAt: chat.finishedAt ?? null,
      unread: chat.unread ?? false,
    }
  }

  private chatStatus(chat: StoredChat, runtime: Runtime | null): ChatStatus {
    if (runtime?.waiting) return "waiting"
    if (runtime?.running) return "running"
    if (runtime?.failed) return "error"
    // Done sticks until the chat is opened, on every client over the library event.
    if (chat.unread && chat.finishedAt) return "done"
    return "idle"
  }

  private projectAttention(projectId: string): boolean {
    const viewed = [...this.sessions.values()].some((session) => session.projectId === projectId)
    if (viewed) return false
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

  private transcriptState(session: Session): TranscriptState {
    const runtime = this.sessionRuntime(session)
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
        question: null,
        tasks: [],
        windowStart: 0,
        hasOlder: false,
        hasNewer: false,
      }
    }
    const transcript = runtime.transcript()
    return { ...transcript, ...sliceWindow(transcript.messages, this.windowBounds(session)) }
  }

  private windowBounds(session: Session): TranscriptWindow {
    if (session.window.chatId !== session.chatId) return tailWindow
    return session.window.bounds
  }

  private publishAllTo(session: Session): void {
    this.publishMetaTo(session)
    this.publishLibrary(null)
    this.publishTranscriptTo(session)
  }

  private publishMetaTo(session: Session): void {
    this.revision += 1
    this.emit(session.clientId, { type: "meta", revision: this.revision, meta: this.buildMeta(session) })
  }

  // A null clientId publishes to every session, each with its own projection.
  private publishMeta(target: string | null): void {
    for (const session of this.sessionsInScope(target)) this.publishMetaTo(session)
  }

  private publishMetaForProject(projectId: string): void {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId) this.publishMetaTo(session)
    }
  }

  private publishMetaForChat(projectId: string, chatId: string): void {
    for (const session of this.viewersOf(projectId, chatId)) this.publishMetaTo(session)
  }

  private publishLibrary(target: string | null): void {
    let unread = 0
    for (const project of this.library.projects()) {
      for (const chat of this.library.projectChats(project.id)) if (chat.unread) unread += 1
    }
    this.notifier.badge(unread)
    for (const session of this.sessionsInScope(target)) {
      this.revision += 1
      this.emit(session.clientId, { type: "library", revision: this.revision, library: this.libraryState(session) })
    }
  }

  private publishTranscriptTo(session: Session): void {
    this.clearPublishTimers()
    this.revision += 1
    this.emit(session.clientId, {
      type: "transcript",
      revision: this.revision,
      projectId: session.projectId,
      chatId: session.chatId,
      ...this.transcriptState(session),
    })
  }

  private sessionsInScope(target: string | null): Session[] {
    if (target === null) return [...this.sessions.values()]
    const session = this.sessions.get(target)
    return session ? [session] : []
  }

  private sessionRuntime(session: Session): Runtime | null {
    if (!session.projectId || !session.chatId) return null
    return this.runtimeFor(session.projectId, session.chatId)
  }

  private requireSession(clientId: string): Session {
    const session = this.sessions.get(clientId)
    if (!session) throw new Error("The client is not connected.")
    return session
  }

  private viewersOf(projectId: string, chatId: string): Session[] {
    const viewers: Session[] = []
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId && session.chatId === chatId) viewers.push(session)
    }
    return viewers
  }

  private isViewed(projectId: string, chatId: string): boolean {
    return this.viewersOf(projectId, chatId).length > 0
  }

  private clearPublishTimers(): void {
    for (const [key, timer] of this.timers) {
      if (!key.startsWith("publish:")) continue
      clearTimeout(timer)
      this.timers.delete(key)
    }
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
