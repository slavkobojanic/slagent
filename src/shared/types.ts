export const channels = {
  snapshot: "agent:snapshot",
  prompt: "agent:prompt",
  abort: "agent:abort",
  newSession: "agent:new-session",
  chooseFolder: "agent:choose-folder",
  setModel: "agent:set-model",
  saveKey: "agent:save-key",
  logout: "agent:logout",
  openExternal: "agent:open-external",
  setQueueMode: "agent:set-queue-mode",
  removeQueued: "agent:remove-queued",
  clearTerminal: "agent:clear-terminal",
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

export type UserMessage = {
  id: string
  role: "user"
  text: string
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
  running: boolean
  isError: boolean
}

export type ChatMessage = UserMessage | AssistantMessage | ToolMessage

export type QueueMode = "follow-up" | "steer"

export type QueuedMessage = {
  id: string
  text: string
  mode: QueueMode
}

export type TranscriptState = {
  messages: ChatMessage[]
  streaming: boolean
  notice: string | null
  queue: QueuedMessage[]
  terminal: string
  terminalStreaming: boolean
}

export type Snapshot = TranscriptState & {
  revision: number
  meta: AppMeta
}

export type UiEvent =
  | { type: "meta"; revision: number; meta: AppMeta }
  | ({ type: "transcript"; revision: number } & TranscriptState)

export type ComputerPermissions = {
  accessibility: boolean
  screenRecording: boolean
  error: string | null
}

export type SlagentApi = {
  platform: string
  getSnapshot: () => Promise<Snapshot>
  prompt: (text: string) => Promise<void>
  abort: () => Promise<void>
  newSession: () => Promise<void>
  chooseFolder: () => Promise<void>
  setModel: (modelId: string) => Promise<void>
  saveOpenRouterKey: (apiKey: string) => Promise<void>
  logoutOpenRouter: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  setQueueMode: (id: string, mode: QueueMode) => Promise<void>
  removeQueued: (id: string) => Promise<void>
  clearTerminal: () => Promise<void>
  getPermissions: () => Promise<ComputerPermissions>
  requestAccessibility: () => Promise<ComputerPermissions>
  requestScreenRecording: () => Promise<ComputerPermissions>
  openPermissionSettings: (pane: "accessibility" | "screen") => Promise<void>
  onEvent: (listener: (event: UiEvent) => void) => () => void
}
