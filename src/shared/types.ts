export const channels = {
  snapshot: "agent:snapshot",
  prompt: "agent:prompt",
  abort: "agent:abort",
  newChat: "agent:new-chat",
  openProject: "agent:open-project",
  openChat: "agent:open-chat",
  searchChats: "agent:search-chats",
  pinProject: "agent:pin-project",
  pinChat: "agent:pin-chat",
  renameChat: "agent:rename-chat",
  deleteChat: "agent:delete-chat",
  readTranscript: "agent:read-transcript",
  removeProject: "agent:remove-project",
  searchFiles: "agent:search-files",
  listCommands: "agent:list-commands",
  chooseFolder: "agent:choose-folder",
  setModel: "agent:set-model",
  saveKey: "agent:save-key",
  logout: "agent:logout",
  openExternal: "agent:open-external",
  openInEditor: "agent:open-in-editor",
  readFile: "agent:read-file",
  setQueueMode: "agent:set-queue-mode",
  removeQueued: "agent:remove-queued",
  editMessage: "agent:edit-message",
  setPlanMode: "agent:set-plan-mode",
  approvePlan: "agent:approve-plan",
  answerQuestion: "agent:answer-question",
  rewind: "agent:rewind",
  taskOutput: "agent:task-output",
  stopTask: "agent:stop-task",
  gitStatus: "git:status",
  gitDiff: "git:diff",
  gitCommit: "git:commit",
  gitPush: "git:push",
  gitPullRequest: "git:pull-request",
  gitCommitMessage: "git:commit-message",
  undoRewind: "agent:undo-rewind",
  compact: "agent:compact",
  permissions: "computer:permissions",
  requestAccessibility: "computer:request-accessibility",
  requestScreenRecording: "computer:request-screen-recording",
  openPermissionSettings: "computer:open-permission-settings",
  event: "agent:event",
} as const

export type ModelProvider = "openrouter" | "claude-code"

export type ModelOption = {
  id: string
  name: string
  contextWindow: number
  reasoning: boolean
  provider: ModelProvider
}

export type OpenRouterStatus = {
  configured: boolean
  source: string | null
  type: "api_key" | "oauth" | null
  // OPENROUTER_API_KEY is set in the app's or the user's shell environment.
  envKey: boolean
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
  openRouter: OpenRouterStatus
  extensions: ExtensionInfo[]
  extensionErrors: string[]
  usageTotals: UsageTotals
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
}

export type AssistantMessage = {
  id: string
  role: "assistant"
  text: string
  thinking: string
  streaming: boolean
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

export type PromptRequest = {
  text: string
  mentions: PromptMention[]
  files: PromptFile[]
  comments?: DiffComment[]
}

export type FileMatch = {
  path: string
  name: string
}

export type SlashCommandKind = "skill" | "prompt" | "command"

export type SlashCommand = {
  name: string
  insert: string
  description: string
  kind: SlashCommandKind
}

export type ProjectSummary = {
  id: string
  path: string
  name: string
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
  chats: ChatSummary[]
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

export type TranscriptState = {
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

export type Snapshot = TranscriptState & {
  revision: number
  meta: AppMeta
  library: LibraryState
}

export type UiEvent =
  | { type: "meta"; revision: number; meta: AppMeta }
  | { type: "library"; revision: number; library: LibraryState }
  | ({ type: "transcript"; revision: number; projectId: string | null; chatId: string | null } & TranscriptState)

export type ComputerPermissions = {
  accessibility: boolean
  screenRecording: boolean
  error: string | null
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

export type SlagentApi = {
  platform: string
  systemVersion: string
  getSnapshot: () => Promise<Snapshot>
  prompt: (request: PromptRequest) => Promise<void>
  abort: () => Promise<void>
  newChat: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  openChat: (chatId: string, projectId?: string) => Promise<void>
  searchChats: (query: string) => Promise<ChatSearchResult[]>
  pinProject: (projectId: string, pinned: boolean) => Promise<void>
  pinChat: (chatId: string, pinned: boolean) => Promise<void>
  renameChat: (chatId: string, title: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  readTranscript: (chatId: string) => Promise<ChatMessage[]>
  removeProject: (projectId: string, typedName: string) => Promise<void>
  searchFiles: (query: string) => Promise<FileMatch[]>
  listCommands: () => Promise<SlashCommand[]>
  pathForFile: (file: File) => string
  chooseFolder: () => Promise<void>
  setModel: (modelId: string) => Promise<ModelChange>
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
  onEvent: (listener: (event: UiEvent) => void) => () => void
}
