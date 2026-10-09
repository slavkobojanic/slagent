// Transport contract for the websocket server in the main process. Every client
// (Electron window, the future mobile app) speaks it over one socket.
export type WsCall = {
  id: number
  method: string
  params?: unknown[]
}

export type WsReply =
  | { id: number; ok: true; result?: unknown }
  | { id: number; ok: false; message: string }

// Fire-and-forget calls (terminal keystrokes) omit the id and expect no reply.
export type WsClientMessage = WsCall | { method: string; params?: unknown[] }

export type WsPush = { event: UiEvent } | { terminal: TerminalEvent } | { updateReady: string } | { closeRequest: true }

export type WsServerMessage = WsReply | WsPush

export type ServerInfo = {
  // The address another device connects to, including the token.
  url: string
  host: string
  port: number
  token: string
  // The Mac's hostname, so a phone with several saved machines can tell them apart.
  name: string
  // Whether the server is reachable on the Tailscale interface.
  tailscale: boolean
}

// The background daemon on the Mac serves remote clients while the app is closed.
export type DaemonStatus = {
  // Only macOS has launchd LaunchAgents.
  supported: boolean
  installed: boolean
  running: boolean
}

// Global agent personalisation. Every field is optional: null or missing means
// "no preference", so the agent keeps its own defaults.
export type PersonalisationTone = "direct" | "friendly" | "professional"
export type PersonalisationBrevity = "terse" | "balanced" | "detailed"
export type PersonalisationBranch = "descriptive" | "prefix"
// Where the agent works: directly on main, or on a new branch for every change.
export type PersonalisationGitWorkflow = "main" | "branch"
export type PersonalisationCommit = "conventional" | "imperative" | "free"
export type PersonalisationExplanation = "minimal" | "normal" | "educational"
// When the agent commits: only after a yes, only when told to, or on its own
// (once at the end of the work, or in small chunks as it goes).
export type PersonalisationCommitStrategy = "ask" | "when-asked" | "at-end" | "as-you-go"

// A user-pinned context file, re-sent in the system prompt of every request so
// compaction can never drop it (e.g. GUIDELINES.md, DESIGN.md).
export type PinnedFile = {
  name: string
  content: string
}
// Pinned files live in the system prompt permanently, so they are capped:
// 25k characters per file, 50k characters in total (~12.5k tokens).
export const PINNED_FILE_CHAR_LIMIT = 25_000
export const PINNED_TOTAL_CHAR_LIMIT = 50_000
export const PINNED_FILE_COUNT_LIMIT = 10

export type Personalisation = {
  tone: PersonalisationTone | null
  brevity: PersonalisationBrevity | null
  branchNaming: PersonalisationBranch | null
  // Branch prefix, used with branchNaming: "prefix" (e.g. "feat" for feat/fix-x).
  branchPrefix: string | null
  // Work directly on main, or create a new branch for changes before starting work.
  gitWorkflow: PersonalisationGitWorkflow | null
  commitStyle: PersonalisationCommit | null
  emoji: boolean | null
  // Reply language, or null to match the user's messages.
  language: string | null
  explanation: PersonalisationExplanation | null
  // Run typecheck/tests before ending a turn that changed code.
  checkBeforeFinish: boolean | null
  commitStrategy: PersonalisationCommitStrategy | null
  // Free-text instructions, appended verbatim.
  notes: string | null
  // Files whose content is appended to the system prompt of every request.
  pinnedFiles: PinnedFile[] | null
}

export const EMPTY_PERSONALISATION: Personalisation = {
  tone: null,
  brevity: null,
  branchNaming: null,
  branchPrefix: null,
  gitWorkflow: null,
  commitStyle: null,
  emoji: null,
  language: null,
  explanation: null,
  checkBeforeFinish: null,
  commitStrategy: null,
  notes: null,
  pinnedFiles: null,
}

export type ModelProvider = "openrouter" | "claude-code"

// Which OpenRouter providers to favour when several serve the same model.
export type ModelRouting = "speed" | "cost" | "balance"

// How hard the model reasons. Matches pi's ThinkingLevel, which OpenRouter
// models map to reasoning effort and Claude models to the SDK's effortLevel.
export type EffortLevel = "minimal" | "low" | "medium" | "high" | "xhigh" | "max"

export type ModelOption = {
  id: string
  name: string
  contextWindow: number
  reasoning: boolean
  provider: ModelProvider
}

// A small, cheap model offered for naming chats. Naming never runs on the
// chat's own model, so this list is curated rather than taken from the catalog.
export type TitleModelOption = {
  id: string
  name: string
}

export type OpenRouterStatus = {
  configured: boolean
  source: string | null
  type: "api_key" | "oauth" | null
  // OPENROUTER_API_KEY is set in the app's or the user's shell environment.
  envKey: boolean
}

// The `slagent` shell command. "outdated" is ours but from an older build;
// "conflict" is some other program's file at the same path.
export type CliStatus = {
  path: string
  state: "installed" | "outdated" | "missing" | "conflict" | "unsupported"
}

export type ExtensionInfo = {
  id: string
  name: string
  scope: string
}

export type AppMeta = {
  ready: boolean
  error: string | null
  cwd: string
  agentDir: string
  modelId: string | null
  modelName: string | null
  modelProvider: ModelProvider | null
  models: ModelOption[]
  routing: ModelRouting
  effort: EffortLevel
  titleModelId: string | null
  titleModels: TitleModelOption[]
  openRouter: OpenRouterStatus
  extensions: ExtensionInfo[]
  extensionErrors: string[]
  usageTotals: UsageTotals
  personalisation: Personalisation
  // The websocket server other devices connect through, or null before it starts.
  server: ServerInfo | null
}

export type AttachmentKind = "image" | "pdf" | "code" | "file"

export type UserAttachment = {
  id: string
  name: string
  kind: AttachmentKind
  path?: string
  url?: string
}

export type UserMessage = {
  id: string
  role: "user"
  text: string
  attachments: UserAttachment[]
  entryId?: string
  checkpoint?: boolean
  comments?: DiffComment[]
  replies?: ReplyComment[]
}

export type AssistantMessage = {
  id: string
  role: "assistant"
  text: string
  thinking: string
  streaming: boolean
  error: string | null
}

// Live state of one subagent run inside the subagent tool, streamed via the tool's details.
export type SubagentRunState = {
  agent: string
  task: string
  steps: string[]
  state: string
  error: string | null
}

export type ToolMessage = {
  id: string
  role: "tool"
  name: string
  label: string
  args: string
  output: string
  images: string[]
  running: boolean
  isError: boolean
  answers?: AnsweredQuestion[]
  subagent?: SubagentRunState[]
}

export type ChatMessage = UserMessage | AssistantMessage | ToolMessage

export type QueueMode = "follow-up" | "steer"

export type QueuedMessage = {
  id: string
  text: string
  mode: QueueMode
  detail: string
}

export type PromptFile = {
  name: string
  mimeType: string
  path?: string
  dataBase64?: string
}

export type PromptMention = {
  path: string
  name: string
}

export type DiffComment = {
  id: string
  path: string
  line: number
  side: "old" | "new"
  code: string
  text: string
}

// A comment on one block of an assistant response, or on words selected in
// it, sent quoted like an email reply.
export type ReplyComment = {
  id: string
  messageId: string
  // The markdown of the block the comment sits on.
  block: string
  // The commented text: the whole block, or the words selected in it.
  quote: string
  // Where the selected words start in the block's rendered text.
  at?: number
  text: string
}

export type ChatMention = {
  projectId: string
  chatId: string
  title: string
  updatedAt: number
}

export type PromptRequest = {
  text: string
  mentions: PromptMention[]
  // $-mentioned past chats, whose transcripts are attached at send time.
  chatMentions?: ChatMention[]
  files: PromptFile[]
  comments?: DiffComment[]
  replies?: ReplyComment[]
}

export type FileMatch = {
  path: string
  name: string
}

export type SlashCommandKind = "skill" | "prompt" | "command" | "builtin"

// A draft for a new skill, produced by a hidden model call from the last exchange.
export type SkillDraft = {
  name: string
  description: string
  body: string
}

export type DraftSkillInput = {
  userText: string
  assistantText: string
  guidance?: string
}

export type CreateSkillInput = {
  name: string
  description: string
  body: string
  location: SkillLocation
}

export type SkillLocation = "user" | "project"

export type SlashCommand = {
  name: string
  insert: string
  description: string
  kind: SlashCommandKind
}

// "chat" projects are conversations without a picked folder: the app manages
// their cwd under the library root and the agent gets a chat-like prompt.
// Absent mode (older records) means "code".
export type ProjectMode = "chat" | "code"

export type ProjectSummary = {
  id: string
  path: string
  name: string
  // Absent means "code" (older snapshots).
  mode?: ProjectMode
  pinned: boolean
  pinnedAt: number
  lastOpenedAt: number
  running: boolean
  attention: boolean
}

// "done" means the last run finished cleanly; the renderer shows it for
// DONE_WINDOW_MS after finishedAt, then falls back to idle.
export type ChatStatus = "idle" | "running" | "waiting" | "done" | "error"

export const DONE_WINDOW_MS = 5 * 60 * 1000

export type ChatSummary = {
  id: string
  title: string
  pinned: boolean
  pinnedAt: number
  updatedAt: number
  running: boolean
  status: ChatStatus
  finishedAt: number | null
}

export type ChatSearchResult = {
  projectId: string
  projectName: string
  chatId: string
  title: string
  snippet: string
  // The first message whose text matched, or null for a title-only match.
  messageId: string | null
  updatedAt: number
}

export type LibraryState = {
  projects: ProjectSummary[]
  openProjectId: string | null
  // The open project's chats. Other projects keep theirs in chatsByProject, so the
  // sidebar can show several projects at once.
  chats: ChatSummary[]
  chatsByProject: Record<string, ChatSummary[]>
  openChatId: string | null
}

export type TaskInfo = {
  id: string
  label: string
  command: string
  status: "running" | "done" | "failed" | "stopped"
  exitCode: number | null
  startedAt: number
  endedAt: number | null
}

// What a question or option can show besides text. Images are URLs the
// renderer can load: remote, data URIs, or project files copied into the
// chat's attachments. HTML renders in a sandboxed frame.
export type QuestionMedia = {
  preview?: string
  image?: string
  html?: string
}

export type QuestionOption = QuestionMedia & {
  label: string
  description?: string
  recommended?: boolean
}

export type Question = QuestionMedia & {
  id: string
  question: string
  header?: string
  multiSelect: boolean
  options: QuestionOption[]
}

// An ask_user call waiting on the user. The id is the tool call id.
export type QuestionRequest = {
  id: string
  questions: Question[]
}

export type QuestionAnswer = {
  questionId: string
  selected: string[]
  other?: string
  note?: string
}

export type QuestionReply =
  | { skipped: false; answers: QuestionAnswer[] }
  | { skipped: true; message?: string }

export type AnsweredQuestion = {
  question: string
  header?: string
  selected: string[]
  // Images of the picked options, so the answer can show what was chosen.
  images?: string[]
  other?: string
  note?: string
  skipped: boolean
}

export type TodoStatus ="pending" | "in_progress" | "completed"

export type TodoItem = {
  text: string
  status: TodoStatus
}

export type UsageState = {
  contextTokens: number | null
  contextWindow: number
  percent: number | null
  inputTokens: number
  outputTokens: number
  cacheTokens: number
  totalTokens: number
  cost: number
}

export type UsageTotals = {
  tokens: number
  cost: number
  chats: number
}

export type UsageDay = {
  // Local date, YYYY-MM-DD.
  day: string
  tokens: number
  cost: number
}

export type UsageCumulative = {
  day: string
  // Running lifetime cost up to and including this day.
  cost: number
}

export type UsageModelStats = {
  model: string
  provider: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  turns: number
}

export type UsageStats = {
  // The last 365 local days that have rows.
  days: UsageDay[]
  // Lifetime cumulative spend, one point per active day.
  cumulative: UsageCumulative[]
  totalTokens: number
  totalCost: number
  totalTurns: number
  models: UsageModelStats[]
  // True while the one-shot backfill is still importing history.
  importing: boolean
}

// What a chat runtime reports; the host narrows `messages` to the visible window.
export type RuntimeTranscript = {
  messages: ChatMessage[]
  streaming: boolean
  notice: string | null
  queue: QueuedMessage[]
  usage: UsageState | null
  todos: TodoItem[]
  planMode: boolean
  planProposal: string | null
  question: QuestionRequest | null
  tasks: TaskInfo[]
}

export type TranscriptState = RuntimeTranscript & {
  // Index of messages[0] within the whole chat.
  windowStart: number
  hasOlder: boolean
  hasNewer: boolean
}

export type TranscriptPage = "older" | "newer" | "latest"

export type Snapshot = TranscriptState & {
  revision: number
  meta: AppMeta
  library: LibraryState
}

export type UiEvent =
  | { type: "meta"; revision: number; meta: AppMeta }
  | { type: "library"; revision: number; library: LibraryState }
  | ({ type: "transcript"; revision: number; projectId: string | null; chatId: string | null } & TranscriptState)
  | { type: "git"; revision: number }

export type ComputerPermissions = {
  accessibility: boolean
  screenRecording: boolean
  error: string | null
}

// Whether an MCP server is reachable. "needs-auth" means the server
// rejected the connection and the user has to complete OAuth sign-in.
export type McpServerState = "connected" | "needs-auth" | "error" | "disabled"

export type McpServerStatus = {
  name: string
  state: McpServerState
  enabled: boolean
  // Whether the server authenticates with OAuth, and so can be signed in or out.
  oauth: boolean
  // Tools the server offered at the last successful connection.
  tools: number
  description: string | null
  // Error text or the server's own instructions.
  detail: string | null
}

export type RewindMode = "both" | "chat" | "code"

export type RewindResult = {
  text: string
  undo: string | null
}

export type GitFile = {
  path: string
  status: "added" | "modified" | "deleted" | "renamed" | "conflict"
  staged: boolean
}

export type GitStatus = {
  repo: boolean
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  files: GitFile[]
}

export type DiffScope = "uncommitted" | "turn"

export type FileView = {
  path: string
  absolutePath: string
  line: number | null
  contents: string
  size: number
  binary: boolean
  truncated: boolean
}

export type ModelChange = {
  applied: boolean
}

// A shell running in the built-in terminal. The title starts as the shell's name
// and follows the OSC title escape sequence the shell writes.
export type TerminalSession = {
  id: string
  title: string
  cwd: string
}

export type TerminalEvent =
  | { type: "data"; id: string; data: string }
  | { type: "exit"; id: string; exitCode: number }

// The outcome of an explicit check for updates from the renderer.
export type UpdateCheckResult =
  | { status: "disabled" }
  | { status: "up-to-date"; version: string }
  | { status: "available"; version: string }
  | { status: "ready"; version: string }
  | { status: "error"; message: string }

export type SlagentApi = {
  platform: string
  systemVersion: string
  getSnapshot: () => Promise<Snapshot>
  prompt: (request: PromptRequest) => Promise<void>
  abort: () => Promise<void>
  // Starts a draft in the project; the project becomes the active one when it is not already.
  newChat: (projectId?: string) => Promise<void>
  openProject: (projectId: string) => Promise<void>
  // messageId opens the chat scrolled to that message instead of the bottom.
  openChat: (chatId: string, projectId?: string, messageId?: string) => Promise<void>
  pageTranscript: (page: TranscriptPage) => Promise<void>
  searchChats: (query: string) => Promise<ChatSearchResult[]>
  pinProject: (projectId: string, pinned: boolean) => Promise<void>
  // projectId names the chat's project; it falls back to the open project.
  pinChat: (chatId: string, pinned: boolean, projectId?: string) => Promise<void>
  renameChat: (chatId: string, title: string, projectId?: string) => Promise<void>
  deleteChat: (chatId: string, projectId?: string) => Promise<void>
  readTranscript: (chatId: string, projectId?: string) => Promise<ChatMessage[]>
  removeProject: (projectId: string, typedName: string) => Promise<void>
  searchFiles: (query: string) => Promise<FileMatch[]>
  listCommands: () => Promise<SlashCommand[]>
  draftSkill: (input: DraftSkillInput) => Promise<SkillDraft>
  createSkill: (input: CreateSkillInput) => Promise<string>
  pathForFile: (file: File) => string
  chooseFolder: () => Promise<void>
  createChatProject: () => Promise<void>
  setModel: (modelId: string) => Promise<ModelChange>
  setTitleModel: (modelId: string) => Promise<void>
  setRouting: (routing: ModelRouting) => Promise<void>
  setEffort: (effort: EffortLevel) => Promise<void>
  saveOpenRouterKey: (apiKey: string) => Promise<void>
  logoutOpenRouter: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  openInEditor: (path: string) => Promise<boolean>
  readFile: (path: string) => Promise<FileView | null>
  setQueueMode: (id: string, mode: QueueMode) => Promise<void>
  removeQueued: (id: string) => Promise<void>
  editMessage: (id: string, text: string) => Promise<void>
  setPlanMode: (enabled: boolean) => Promise<void>
  approvePlan: () => Promise<void>
  answerQuestion: (id: string, reply: QuestionReply) => Promise<void>
  rewind: (id: string, mode: RewindMode) => Promise<RewindResult>
  undoRewind: (commit: string) => Promise<void>
  taskOutput: (id: string) => Promise<string>
  stopTask: (id: string) => Promise<void>
  gitStatus: () => Promise<GitStatus>
  gitDiff: (scope: DiffScope) => Promise<string>
  gitCommit: (message: string) => Promise<string>
  gitPush: () => Promise<void>
  gitPullRequest: () => Promise<string>
  gitCommitMessage: () => Promise<string>
  compact: () => Promise<void>
  getPermissions: () => Promise<ComputerPermissions>
  requestAccessibility: () => Promise<ComputerPermissions>
  requestScreenRecording: () => Promise<ComputerPermissions>
  openPermissionSettings: (pane: "accessibility" | "screen") => Promise<void>
  mcpList: () => Promise<McpServerStatus[]>
  mcpSignIn: (name: string) => Promise<McpServerStatus[]>
  mcpSignOut: (name: string) => Promise<McpServerStatus[]>
  mcpSetEnabled: (name: string, enabled: boolean) => Promise<McpServerStatus[]>
  usageStats: () => Promise<UsageStats>
  onEvent: (listener: (event: UiEvent) => void) => () => void
  // The socket dropped and came back; the caller re-fetches the snapshot.
  onReconnect: (listener: () => void) => () => void
  appVersion: () => Promise<string>
  // Version of a downloaded update waiting for a restart, or null.
  updateStatus: () => Promise<string | null>
  checkForUpdates: () => Promise<UpdateCheckResult>
  installUpdate: () => Promise<void>
  onUpdateReady: (listener: (version: string) => void) => () => void
  cliStatus: () => Promise<CliStatus>
  installCli: () => Promise<CliStatus>
  uninstallCli: () => Promise<CliStatus>
  // The LaunchAgent daemon that keeps the server reachable with the app closed.
  daemonStatus: () => Promise<DaemonStatus>
  enableDaemon: () => Promise<DaemonStatus>
  disableDaemon: () => Promise<DaemonStatus>
  setPersonalisation: (value: Personalisation) => Promise<void>
  // Opens a file picker and returns the picked text files with their contents.
  pickContextFiles: () => Promise<PinnedFile[]>
  // Spawns a shell in the project folder and returns its session.
  createTerminal: () => Promise<TerminalSession>
  // Keystrokes and paste go to the shell without waiting for a reply.
  writeTerminal: (id: string, data: string) => void
  resizeTerminal: (id: string, cols: number, rows: number) => void
  closeTerminal: (id: string) => void
  onTerminalEvent: (listener: (event: TerminalEvent) => void) => () => void
  // The main process asks before Cmd+W closes the window; closeApp confirms it.
  onCloseRequest: (listener: () => void) => () => void
  closeApp: () => Promise<void>
}
