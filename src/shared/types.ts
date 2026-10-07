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
  setQueueMode: "agent:set-queue-mode",
  removeQueued: "agent:remove-queued",
  editMessage: "agent:edit-message",
  setPlanMode: "agent:set-plan-mode",
  approvePlan: "agent:approve-plan",
  rewind: "agent:rewind",
  undoRewind: "agent:undo-rewind",
  clearTerminal: "agent:clear-terminal",
  compact: "agent:compact",
  permissions: "computer:permissions",
  requestAccessibility: "computer:request-accessibility",
  requestScreenRecording: "computer:request-screen-recording",
  openPermissionSettings: "computer:open-permission-settings",
  event: "agent:event",
} as const

export type ModelOption = {
  id: string
  name: string
  contextWindow: number
  reasoning: boolean
}

export type OpenRouterStatus = {
  configured: boolean
  source: string | null
  type: "api_key" | "oauth" | null
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
  models: ModelOption[]
  openRouter: OpenRouterStatus
  extensions: ExtensionInfo[]
  extensionErrors: string[]
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

export type PromptRequest = {
  text: string
  mentions: PromptMention[]
  files: PromptFile[]
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

export type ChatStatus = "idle" | "running" | "waiting" | "unread" | "error"

export type ChatSummary = {
  id: string
  title: string
  pinned: boolean
  pinnedAt: number
  updatedAt: number
  running: boolean
  status: ChatStatus
}

export type ChatSearchResult = {
  projectId: string
  projectName: string
  chatId: string
  title: string
  snippet: string
  updatedAt: number
}

export type LibraryState = {
  projects: ProjectSummary[]
  openProjectId: string | null
  chats: ChatSummary[]
  openChatId: string | null
}

export type TodoStatus = "pending" | "in_progress" | "completed"

export type TodoItem = {
  text: string
  status: TodoStatus
}

export type UsageState = {
  contextTokens: number | null
  contextWindow: number
  percent: number | null
  totalTokens: number
  cost: number
}

export type TranscriptState = {
  messages: ChatMessage[]
  streaming: boolean
  notice: string | null
  queue: QueuedMessage[]
  terminal: string
  terminalStreaming: boolean
  usage: UsageState | null
  todos: TodoItem[]
  planMode: boolean
  planProposal: string | null
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
  setQueueMode: (id: string, mode: QueueMode) => Promise<void>
  removeQueued: (id: string) => Promise<void>
  editMessage: (id: string, text: string) => Promise<void>
  setPlanMode: (enabled: boolean) => Promise<void>
  approvePlan: () => Promise<void>
  rewind: (id: string, mode: RewindMode) => Promise<RewindResult>
  undoRewind: (commit: string) => Promise<void>
  clearTerminal: () => Promise<void>
  compact: () => Promise<void>
  getPermissions: () => Promise<ComputerPermissions>
  requestAccessibility: () => Promise<ComputerPermissions>
  requestScreenRecording: () => Promise<ComputerPermissions>
  openPermissionSettings: (pane: "accessibility" | "screen") => Promise<void>
  onEvent: (listener: (event: UiEvent) => void) => () => void
}
