import { contextBridge, webUtils } from "electron"
import type { SlagentApi, TerminalEvent, UiEvent, WsClientMessage, WsServerMessage } from "../shared/types"

// Connection details arrive from the main process as --slagent-key=value switches
// at the end of the sandboxed preload's argv.
function readArgument(key: string): string {
  const prefix = `--slagent-${key}=`
  const found = process.argv.find((arg) => typeof arg === "string" && arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : ""
}

const port = readArgument("port")
const token = readArgument("token")
const clientId = readArgument("client")
const windowToken = readArgument("window")

// The awaited result of a SlagentApi method, keyed by its name.
type Result<M extends keyof SlagentApi> = Awaited<ReturnType<Extract<SlagentApi[M], (...args: never[]) => unknown>>>

// One websocket carries every call and push. It reconnects on its own; the
// renderer listens for onReconnect and re-fetches the snapshot.
class Bridge {
  private socket: WebSocket | null = null
  private nextId = 1
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
  readonly eventListeners = new Set<(event: UiEvent) => void>()
  readonly terminalListeners = new Set<(event: TerminalEvent) => void>()
  readonly updateListeners = new Set<(version: string) => void>()
  readonly closeRequestListeners = new Set<() => void>()
  readonly reconnectListeners = new Set<() => void>()
  private retry: ReturnType<typeof setTimeout> | null = null

  connect(): void {
    const url = `ws://127.0.0.1:${port}?token=${encodeURIComponent(token)}&client=${encodeURIComponent(clientId)}&window=${encodeURIComponent(windowToken)}`
    const socket = new WebSocket(url)
    this.socket = socket
    socket.onopen = () => {
      if (this.retry !== null) {
        clearTimeout(this.retry)
        this.retry = null
        for (const listener of this.reconnectListeners) listener()
      }
    }
    socket.onmessage = (message) => {
      let parsed: WsServerMessage
      try {
        parsed = JSON.parse(String(message.data)) as WsServerMessage
      } catch {
        return
      }
      if ("id" in parsed) {
        const pending = this.pending.get(parsed.id)
        if (!pending) return
        this.pending.delete(parsed.id)
        if (parsed.ok) pending.resolve(parsed.result)
        else pending.reject(new Error(parsed.message))
        return
      }
      if ("event" in parsed) {
        for (const listener of this.eventListeners) listener(parsed.event)
        return
      }
      if ("terminal" in parsed) {
        for (const listener of this.terminalListeners) listener(parsed.terminal)
        return
      }
      if ("updateReady" in parsed) {
        for (const listener of this.updateListeners) listener(parsed.updateReady)
        return
      }
      if ("closeRequest" in parsed) {
        for (const listener of this.closeRequestListeners) listener()
      }
    }
    socket.onclose = () => {
      this.socket = null
      for (const pending of this.pending.values()) pending.reject(new Error("The connection was closed."))
      this.pending.clear()
      this.retry = setTimeout(() => this.connect(), 1000)
    }
    socket.onerror = () => socket.close()
  }

  call<T>(method: string, ...params: unknown[]): Promise<T> {
    const socket = this.socket
    if (!socket) return Promise.reject(new Error("Not connected."))
    const id = (this.nextId += 1)
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      const message: WsClientMessage = { id, method, params }
      socket.send(JSON.stringify(message))
    })
  }

  // Keystrokes and terminal drags go out without waiting for a reply.
  send(method: string, params: unknown[]): void {
    const socket = this.socket
    if (!socket) return
    const message: WsClientMessage = { method, params }
    socket.send(JSON.stringify(message))
  }
}

const bridge = new Bridge()
bridge.connect()

const api: SlagentApi = {
  platform: process.platform,
  systemVersion: process.getSystemVersion(),
  appVersion: () => bridge.call<string>("appVersion"),
  getSnapshot: () => bridge.call<Result<"getSnapshot">>("getSnapshot"),
  prompt: (request) => bridge.call<void>("prompt", request),
  abort: () => bridge.call<void>("abort"),
  newChat: (projectId) => bridge.call<void>("newChat", projectId),
  openProject: (projectId) => bridge.call<void>("openProject", projectId),
  openChat: (chatId, projectId, messageId) => bridge.call<void>("openChat", chatId, projectId, messageId),
  pageTranscript: (page) => bridge.call<void>("pageTranscript", page),
  searchChats: (query) => bridge.call<Result<"searchChats">>("searchChats", query),
  pinProject: (projectId, pinned) => bridge.call<void>("pinProject", projectId, pinned),
  pinChat: (chatId, pinned, projectId) => bridge.call<void>("pinChat", chatId, pinned, projectId),
  renameChat: (chatId, title, projectId) => bridge.call<void>("renameChat", chatId, title, projectId),
  deleteChat: (chatId, projectId) => bridge.call<void>("deleteChat", chatId, projectId),
  readTranscript: (chatId, projectId) => bridge.call<Result<"readTranscript">>("readTranscript", chatId, projectId),
  removeProject: (projectId, typedName) => bridge.call<void>("removeProject", projectId, typedName),
  searchFiles: (query) => bridge.call<Result<"searchFiles">>("searchFiles", query),
  listCommands: () => bridge.call<Result<"listCommands">>("listCommands"),
  draftSkill: (input) => bridge.call<Result<"draftSkill">>("draftSkill", input),
  createSkill: (input) => bridge.call<string>("createSkill", input),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ""
    }
  },
  chooseFolder: () => bridge.call<void>("chooseFolder"),
  createChatProject: () => bridge.call<void>("createChatProject"),
  setModel: (modelId) => bridge.call<Result<"setModel">>("setModel", modelId),
  setTitleModel: (modelId) => bridge.call<void>("setTitleModel", modelId),
  setRouting: (routing) => bridge.call<void>("setRouting", routing),
  setEffort: (effort) => bridge.call<void>("setEffort", effort),
  saveOpenRouterKey: (apiKey) => bridge.call<void>("saveOpenRouterKey", apiKey),
  logoutOpenRouter: () => bridge.call<void>("logoutOpenRouter"),
  openExternal: (url) => bridge.call<void>("openExternal", url),
  openInEditor: (path) => bridge.call<boolean>("openInEditor", path),
  readFile: (path) => bridge.call<Result<"readFile">>("readFile", path),
  setQueueMode: (id, mode) => bridge.call<void>("setQueueMode", id, mode),
  removeQueued: (id) => bridge.call<void>("removeQueued", id),
  editMessage: (id, text) => bridge.call<void>("editMessage", id, text),
  setPlanMode: (enabled) => bridge.call<void>("setPlanMode", enabled),
  approvePlan: () => bridge.call<void>("approvePlan"),
  answerQuestion: (id, reply) => bridge.call<void>("answerQuestion", id, reply),
  rewind: (id, mode) => bridge.call<Result<"rewind">>("rewind", id, mode),
  undoRewind: (commit) => bridge.call<void>("undoRewind", commit),
  taskOutput: (id) => bridge.call<string>("taskOutput", id),
  stopTask: (id) => bridge.call<void>("stopTask", id),
  gitStatus: () => bridge.call<Result<"gitStatus">>("gitStatus"),
  gitDiff: (scope) => bridge.call<string>("gitDiff", scope),
  gitCommit: (message) => bridge.call<string>("gitCommit", message),
  gitPush: () => bridge.call<void>("gitPush"),
  gitPullRequest: () => bridge.call<string>("gitPullRequest"),
  gitCommitMessage: () => bridge.call<string>("gitCommitMessage"),
  compact: () => bridge.call<void>("compact"),
  getPermissions: () => bridge.call<Result<"getPermissions">>("getPermissions"),
  requestAccessibility: () => bridge.call<Result<"requestAccessibility">>("requestAccessibility"),
  requestScreenRecording: () => bridge.call<Result<"requestScreenRecording">>("requestScreenRecording"),
  openPermissionSettings: (pane) => bridge.call<void>("openPermissionSettings", pane),
  mcpList: () => bridge.call<Result<"mcpList">>("mcpList"),
  mcpSignIn: (name) => bridge.call<Result<"mcpSignIn">>("mcpSignIn", name),
  mcpSignOut: (name) => bridge.call<Result<"mcpSignOut">>("mcpSignOut", name),
  mcpSetEnabled: (name, enabled) => bridge.call<Result<"mcpSetEnabled">>("mcpSetEnabled", name, enabled),
  onEvent: (listener) => {
    bridge.eventListeners.add(listener)
    return () => bridge.eventListeners.delete(listener)
  },
  onReconnect: (listener) => {
    bridge.reconnectListeners.add(listener)
    return () => bridge.reconnectListeners.delete(listener)
  },
  updateStatus: () => bridge.call<string | null>("updateStatus"),
  checkForUpdates: () => bridge.call<Result<"checkForUpdates">>("updateCheck"),
  installUpdate: () => bridge.call<void>("installUpdate"),
  onUpdateReady: (listener) => {
    bridge.updateListeners.add(listener)
    return () => bridge.updateListeners.delete(listener)
  },
  cliStatus: () => bridge.call<Result<"cliStatus">>("cliStatus"),
  installCli: () => bridge.call<Result<"installCli">>("installCli"),
  uninstallCli: () => bridge.call<Result<"uninstallCli">>("uninstallCli"),
  setPersonalisation: (value) => bridge.call<void>("setPersonalisation", value),
  pickContextFiles: () => bridge.call<Result<"pickContextFiles">>("pickContextFiles"),
  createTerminal: () => bridge.call<Result<"createTerminal">>("terminalCreate"),
  writeTerminal: (id, data) => bridge.send("writeTerminal", [id, data]),
  resizeTerminal: (id, cols, rows) => bridge.send("resizeTerminal", [id, cols, rows]),
  closeTerminal: (id) => bridge.send("closeTerminal", [id]),
  onTerminalEvent: (listener) => {
    bridge.terminalListeners.add(listener)
    return () => bridge.terminalListeners.delete(listener)
  },
  onCloseRequest: (listener) => {
    bridge.closeRequestListeners.add(listener)
    return () => bridge.closeRequestListeners.delete(listener)
  },
  closeApp: () => bridge.call<void>("closeApp"),
}

contextBridge.exposeInMainWorld("slagent", api)
