import type { SlagentApi, TerminalEvent, UiEvent, WsClientMessage, WsServerMessage } from "./types"

// Where the socket is: "connecting" before the first open and while it
// retries, "open" once calls can go out.
export type WsStatus = "connecting" | "open"

// The awaited result of a SlagentApi method, keyed by its name.
type Result<M extends keyof SlagentApi> = Awaited<ReturnType<Extract<SlagentApi[M], (...args: never[]) => unknown>>>

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void }

// One websocket carries every call and push. It reconnects on its own and
// fires the reconnect listeners when it comes back, so a client re-fetches
// the snapshot. Calls made before the socket opens wait for it.
export class WsClient {
  private socket: WebSocket | null = null
  private open = false
  private nextId = 1
  private retry: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private everOpened = false
  private readonly pending = new Map<number, Pending>()
  private readonly outbox: string[] = []
  readonly eventListeners = new Set<(event: UiEvent) => void>()
  readonly terminalListeners = new Set<(event: TerminalEvent) => void>()
  readonly updateListeners = new Set<(version: string) => void>()
  readonly closeRequestListeners = new Set<() => void>()
  readonly reconnectListeners = new Set<() => void>()
  readonly statusListeners = new Set<(status: WsStatus) => void>()

  constructor(
    private readonly url: string,
    // Remote clients rewrite the server's slagent:// attachment links before parsing.
    private readonly rewrite: (text: string) => string = (text) => text,
    private readonly retryMs = 1000,
  ) {}

  get status(): WsStatus {
    return this.open ? "open" : "connecting"
  }

  connect = (): void => {
    if (this.closed || this.socket !== null) return
    if (this.retry !== null) {
      clearTimeout(this.retry)
      this.retry = null
    }
    const socket = new WebSocket(this.url)
    this.socket = socket
    socket.onopen = () => {
      this.open = true
      for (const text of this.outbox.splice(0)) socket.send(text)
      this.emitStatus()
      if (this.everOpened) {
        for (const listener of this.reconnectListeners) listener()
      }
      this.everOpened = true
    }
    socket.onmessage = (message) => this.receive(String(message.data))
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.open = false
      this.outbox.length = 0
      for (const pending of this.pending.values()) pending.reject(new Error("The connection was closed."))
      this.pending.clear()
      this.emitStatus()
      if (!this.closed) this.retry = setTimeout(this.connect, this.retryMs)
    }
    socket.onerror = () => socket.close()
  }

  // Reconnects now instead of waiting out the retry timer, e.g. when an app
  // comes back to the foreground.
  wake = (): void => {
    if (this.closed || this.socket !== null) return
    this.connect()
  }

  close = (): void => {
    this.closed = true
    if (this.retry !== null) clearTimeout(this.retry)
    this.socket?.close()
  }

  call = <T>(method: string, ...params: unknown[]): Promise<T> => {
    if (this.socket === null) return Promise.reject(new Error("Not connected."))
    const id = (this.nextId += 1)
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      const message: WsClientMessage = { id, method, params }
      this.write(JSON.stringify(message))
    })
  }

  // Keystrokes and terminal drags go out without waiting for a reply.
  send = (method: string, params: unknown[]): void => {
    if (!this.open) return
    const message: WsClientMessage = { method, params }
    this.write(JSON.stringify(message))
  }

  private write(text: string): void {
    if (this.open && this.socket !== null) {
      this.socket.send(text)
      return
    }
    this.outbox.push(text)
  }

  private emitStatus(): void {
    for (const listener of this.statusListeners) listener(this.status)
  }

  private receive(data: string): void {
    let parsed: WsServerMessage
    try {
      parsed = JSON.parse(this.rewrite(data)) as WsServerMessage
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
}

// What differs between clients: the preload knows the OS and can read a
// dropped file's path, a phone can do neither and opens links itself.
export type LocalApi = Pick<SlagentApi, "platform" | "systemVersion" | "pathForFile"> & Partial<Pick<SlagentApi, "openExternal">>

export function createSlagentApi(client: WsClient, local: LocalApi): SlagentApi {
  const { call } = client
  const listen = <T>(set: Set<T>, listener: T): (() => void) => {
    set.add(listener)
    return () => set.delete(listener)
  }
  return {
    platform: local.platform,
    systemVersion: local.systemVersion,
    pathForFile: local.pathForFile,
    appVersion: () => call<string>("appVersion"),
    getSnapshot: () => call<Result<"getSnapshot">>("getSnapshot"),
    prompt: (request) => call<void>("prompt", request),
    abort: () => call<void>("abort"),
    newChat: (projectId) => call<void>("newChat", projectId),
    openProject: (projectId) => call<void>("openProject", projectId),
    openChat: (chatId, projectId, messageId) => call<void>("openChat", chatId, projectId, messageId),
    pageTranscript: (page) => call<void>("pageTranscript", page),
    searchChats: (query) => call<Result<"searchChats">>("searchChats", query),
    pinProject: (projectId, pinned) => call<void>("pinProject", projectId, pinned),
    setProjectAppearance: (projectId, appearance) => call<void>("setProjectAppearance", projectId, appearance),
    pinChat: (chatId, pinned, projectId) => call<void>("pinChat", chatId, pinned, projectId),
    renameChat: (chatId, title, projectId) => call<void>("renameChat", chatId, title, projectId),
    deleteChat: (chatId, projectId) => call<void>("deleteChat", chatId, projectId),
    readTranscript: (chatId, projectId) => call<Result<"readTranscript">>("readTranscript", chatId, projectId),
    removeProject: (projectId, typedName) => call<void>("removeProject", projectId, typedName),
    searchFiles: (query) => call<Result<"searchFiles">>("searchFiles", query),
    listCommands: () => call<Result<"listCommands">>("listCommands"),
    draftSkill: (input) => call<Result<"draftSkill">>("draftSkill", input),
    createSkill: (input) => call<string>("createSkill", input),
    chooseFolder: () => call<void>("chooseFolder"),
    createChatProject: () => call<void>("createChatProject"),
    setModel: (modelId) => call<Result<"setModel">>("setModel", modelId),
    setTitleModel: (modelId) => call<void>("setTitleModel", modelId),
    setRouting: (routing) => call<void>("setRouting", routing),
    setEffort: (effort) => call<void>("setEffort", effort),
    saveOpenRouterKey: (apiKey) => call<void>("saveOpenRouterKey", apiKey),
    logoutOpenRouter: () => call<void>("logoutOpenRouter"),
    openExternal: local.openExternal ?? ((url) => call<void>("openExternal", url)),
    openInEditor: (path) => call<boolean>("openInEditor", path),
    readFile: (path) => call<Result<"readFile">>("readFile", path),
    setQueueMode: (id, mode) => call<void>("setQueueMode", id, mode),
    removeQueued: (id) => call<void>("removeQueued", id),
    editMessage: (id, text) => call<void>("editMessage", id, text),
    setPlanMode: (enabled) => call<void>("setPlanMode", enabled),
    approvePlan: () => call<void>("approvePlan"),
    answerQuestion: (id, reply) => call<void>("answerQuestion", id, reply),
    rewind: (id, mode) => call<Result<"rewind">>("rewind", id, mode),
    undoRewind: (commit) => call<void>("undoRewind", commit),
    taskOutput: (id) => call<string>("taskOutput", id),
    stopTask: (id) => call<void>("stopTask", id),
    gitStatus: () => call<Result<"gitStatus">>("gitStatus"),
    gitDiff: (scope) => call<string>("gitDiff", scope),
    gitCommit: (message) => call<string>("gitCommit", message),
    gitPush: () => call<void>("gitPush"),
    gitPullRequest: () => call<string>("gitPullRequest"),
    gitCommitMessage: () => call<string>("gitCommitMessage"),
    compact: () => call<void>("compact"),
    getPermissions: () => call<Result<"getPermissions">>("getPermissions"),
    requestAccessibility: () => call<Result<"requestAccessibility">>("requestAccessibility"),
    requestScreenRecording: () => call<Result<"requestScreenRecording">>("requestScreenRecording"),
    openPermissionSettings: (pane) => call<void>("openPermissionSettings", pane),
    mcpList: () => call<Result<"mcpList">>("mcpList"),
    mcpSignIn: (name) => call<Result<"mcpSignIn">>("mcpSignIn", name),
    mcpSignOut: (name) => call<Result<"mcpSignOut">>("mcpSignOut", name),
    mcpSetEnabled: (name, enabled) => call<Result<"mcpSetEnabled">>("mcpSetEnabled", name, enabled),
    usageStats: () => call<Result<"usageStats">>("usageStats"),
    onEvent: (listener) => listen(client.eventListeners, listener),
    onReconnect: (listener) => listen(client.reconnectListeners, listener),
    updateStatus: () => call<string | null>("updateStatus"),
    checkForUpdates: () => call<Result<"checkForUpdates">>("updateCheck"),
    installUpdate: () => call<void>("installUpdate"),
    onUpdateReady: (listener) => listen(client.updateListeners, listener),
    cliStatus: () => call<Result<"cliStatus">>("cliStatus"),
    installCli: () => call<Result<"installCli">>("installCli"),
    uninstallCli: () => call<Result<"uninstallCli">>("uninstallCli"),
    daemonStatus: () => call<Result<"daemonStatus">>("daemonStatus"),
    enableDaemon: () => call<Result<"enableDaemon">>("enableDaemon"),
    disableDaemon: () => call<Result<"disableDaemon">>("disableDaemon"),
    setPersonalisation: (value) => call<void>("setPersonalisation", value),
    pickContextFiles: () => call<Result<"pickContextFiles">>("pickContextFiles"),
    createTerminal: () => call<Result<"createTerminal">>("terminalCreate"),
    writeTerminal: (id, data) => client.send("writeTerminal", [id, data]),
    resizeTerminal: (id, cols, rows) => client.send("resizeTerminal", [id, cols, rows]),
    closeTerminal: (id) => client.send("closeTerminal", [id]),
    onTerminalEvent: (listener) => listen(client.terminalListeners, listener),
    onCloseRequest: (listener) => listen(client.closeRequestListeners, listener),
    closeApp: () => call<void>("closeApp"),
  }
}
