import { toJS } from "mobx"
import type { SlagentApi } from "@shared/types"
import type { Log } from "@/log/log"

// Subscriptions and sync calls are not round trips, so they are not timed.
const UNTIMED = ["platform", "systemVersion", "pathForFile", "onEvent", "onUpdateReady", "onTerminalEvent", "writeTerminal", "resizeTerminal", "closeTerminal"]

// Methods close over the bridge instead of holding it in a private field, so a test mock satisfies the type.
// Store values are MobX proxies, which the preload bridge cannot clone, so object arguments go through plain.
// Every round trip is a span on the ipc log.
export class API implements SlagentApi {
  readonly platform: string
  readonly systemVersion: string
  readonly getSnapshot: SlagentApi["getSnapshot"]
  readonly prompt: SlagentApi["prompt"]
  readonly abort: SlagentApi["abort"]
  readonly newChat: SlagentApi["newChat"]
  readonly openProject: SlagentApi["openProject"]
  readonly openChat: SlagentApi["openChat"]
  readonly pageTranscript: SlagentApi["pageTranscript"]
  readonly searchChats: SlagentApi["searchChats"]
  readonly pinProject: SlagentApi["pinProject"]
  readonly pinChat: SlagentApi["pinChat"]
  readonly renameChat: SlagentApi["renameChat"]
  readonly deleteChat: SlagentApi["deleteChat"]
  readonly readTranscript: SlagentApi["readTranscript"]
  readonly removeProject: SlagentApi["removeProject"]
  readonly searchFiles: SlagentApi["searchFiles"]
  readonly listCommands: SlagentApi["listCommands"]
  readonly pathForFile: SlagentApi["pathForFile"]
  readonly chooseFolder: SlagentApi["chooseFolder"]
  readonly setModel: SlagentApi["setModel"]
  readonly setTitleModel: SlagentApi["setTitleModel"]
  readonly setRouting: SlagentApi["setRouting"]
  readonly saveOpenRouterKey: SlagentApi["saveOpenRouterKey"]
  readonly logoutOpenRouter: SlagentApi["logoutOpenRouter"]
  readonly openExternal: SlagentApi["openExternal"]
  readonly openInEditor: SlagentApi["openInEditor"]
  readonly readFile: SlagentApi["readFile"]
  readonly setQueueMode: SlagentApi["setQueueMode"]
  readonly removeQueued: SlagentApi["removeQueued"]
  readonly editMessage: SlagentApi["editMessage"]
  readonly setPlanMode: SlagentApi["setPlanMode"]
  readonly approvePlan: SlagentApi["approvePlan"]
  readonly answerQuestion: SlagentApi["answerQuestion"]
  readonly rewind: SlagentApi["rewind"]
  readonly undoRewind: SlagentApi["undoRewind"]
  readonly taskOutput: SlagentApi["taskOutput"]
  readonly stopTask: SlagentApi["stopTask"]
  readonly gitStatus: SlagentApi["gitStatus"]
  readonly gitDiff: SlagentApi["gitDiff"]
  readonly gitCommit: SlagentApi["gitCommit"]
  readonly gitPush: SlagentApi["gitPush"]
  readonly gitPullRequest: SlagentApi["gitPullRequest"]
  readonly gitCommitMessage: SlagentApi["gitCommitMessage"]
  readonly compact: SlagentApi["compact"]
  readonly getPermissions: SlagentApi["getPermissions"]
  readonly requestAccessibility: SlagentApi["requestAccessibility"]
  readonly requestScreenRecording: SlagentApi["requestScreenRecording"]
  readonly openPermissionSettings: SlagentApi["openPermissionSettings"]
  readonly mcpList: SlagentApi["mcpList"]
  readonly mcpSignIn: SlagentApi["mcpSignIn"]
  readonly mcpSignOut: SlagentApi["mcpSignOut"]
  readonly mcpSetEnabled: SlagentApi["mcpSetEnabled"]
  readonly onEvent: SlagentApi["onEvent"]
  readonly updateStatus: SlagentApi["updateStatus"]
  readonly installUpdate: SlagentApi["installUpdate"]
  readonly onUpdateReady: SlagentApi["onUpdateReady"]
  readonly cliStatus: SlagentApi["cliStatus"]
  readonly installCli: SlagentApi["installCli"]
  readonly uninstallCli: SlagentApi["uninstallCli"]
  readonly setPersonalisation: SlagentApi["setPersonalisation"]
  readonly pickContextFiles: SlagentApi["pickContextFiles"]
  readonly createTerminal: SlagentApi["createTerminal"]
  readonly writeTerminal: SlagentApi["writeTerminal"]
  readonly resizeTerminal: SlagentApi["resizeTerminal"]
  readonly closeTerminal: SlagentApi["closeTerminal"]
  readonly onTerminalEvent: SlagentApi["onTerminalEvent"]

  constructor(raw: SlagentApi, log: Log) {
    const bridge = timed(raw, log)
    this.platform = bridge.platform
    this.systemVersion = bridge.systemVersion
    this.getSnapshot = () => bridge.getSnapshot()
    this.prompt = (request) => bridge.prompt(plain(request))
    this.abort = () => bridge.abort()
    this.newChat = () => bridge.newChat()
    this.openProject = (projectId) => bridge.openProject(projectId)
    this.openChat = (chatId, projectId, messageId) => bridge.openChat(chatId, projectId, messageId)
    this.pageTranscript = (page) => bridge.pageTranscript(plain(page))
    this.searchChats = (query) => bridge.searchChats(query)
    this.pinProject = (projectId, pinned) => bridge.pinProject(projectId, pinned)
    this.pinChat = (chatId, pinned, projectId) => bridge.pinChat(chatId, pinned, projectId)
    this.renameChat = (chatId, title, projectId) => bridge.renameChat(chatId, title, projectId)
    this.deleteChat = (chatId, projectId) => bridge.deleteChat(chatId, projectId)
    this.readTranscript = (chatId, projectId) => bridge.readTranscript(chatId, projectId)
    this.removeProject = (projectId, typedName) => bridge.removeProject(projectId, typedName)
    this.searchFiles = (query) => bridge.searchFiles(query)
    this.listCommands = () => bridge.listCommands()
    this.pathForFile = (file) => bridge.pathForFile(file)
    this.chooseFolder = () => bridge.chooseFolder()
    this.setModel = (modelId) => bridge.setModel(modelId)
    this.setTitleModel = (modelId) => bridge.setTitleModel(modelId)
    this.setRouting = (routing) => bridge.setRouting(routing)
    this.saveOpenRouterKey = (apiKey) => bridge.saveOpenRouterKey(apiKey)
    this.logoutOpenRouter = () => bridge.logoutOpenRouter()
    this.openExternal = (url) => bridge.openExternal(url)
    this.openInEditor = (path) => bridge.openInEditor(path)
    this.readFile = (path) => bridge.readFile(path)
    this.setQueueMode = (id, mode) => bridge.setQueueMode(id, mode)
    this.removeQueued = (id) => bridge.removeQueued(id)
    this.editMessage = (id, text) => bridge.editMessage(id, text)
    this.setPlanMode = (enabled) => bridge.setPlanMode(enabled)
    this.approvePlan = () => bridge.approvePlan()
    this.answerQuestion = (id, reply) => bridge.answerQuestion(id, plain(reply))
    this.rewind = (id, mode) => bridge.rewind(id, mode)
    this.undoRewind = (commit) => bridge.undoRewind(commit)
    this.taskOutput = (id) => bridge.taskOutput(id)
    this.stopTask = (id) => bridge.stopTask(id)
    this.gitStatus = () => bridge.gitStatus()
    this.gitDiff = (scope) => bridge.gitDiff(scope)
    this.gitCommit = (message) => bridge.gitCommit(message)
    this.gitPush = () => bridge.gitPush()
    this.gitPullRequest = () => bridge.gitPullRequest()
    this.gitCommitMessage = () => bridge.gitCommitMessage()
    this.compact = () => bridge.compact()
    this.getPermissions = () => bridge.getPermissions()
    this.requestAccessibility = () => bridge.requestAccessibility()
    this.requestScreenRecording = () => bridge.requestScreenRecording()
    this.openPermissionSettings = (pane) => bridge.openPermissionSettings(pane)
    this.mcpList = () => bridge.mcpList()
    this.mcpSignIn = (name) => bridge.mcpSignIn(name)
    this.mcpSignOut = (name) => bridge.mcpSignOut(name)
    this.mcpSetEnabled = (name, enabled) => bridge.mcpSetEnabled(name, enabled)
    this.onEvent = (listener) => bridge.onEvent(listener)
    this.updateStatus = () => bridge.updateStatus()
    this.installUpdate = () => bridge.installUpdate()
    this.onUpdateReady = (listener) => bridge.onUpdateReady(listener)
    this.cliStatus = () => bridge.cliStatus()
    this.installCli = () => bridge.installCli()
    this.uninstallCli = () => bridge.uninstallCli()
    this.setPersonalisation = (value) => bridge.setPersonalisation(plain(value))
    this.pickContextFiles = () => bridge.pickContextFiles()
    this.createTerminal = () => bridge.createTerminal()
    this.writeTerminal = (id, data) => bridge.writeTerminal(id, data)
    this.resizeTerminal = (id, cols, rows) => bridge.resizeTerminal(id, cols, rows)
    this.closeTerminal = (id) => bridge.closeTerminal(id)
    this.onTerminalEvent = (listener) => bridge.onTerminalEvent(listener)
  }

  static fromWindow(window: Window, log: Log): API | null {
    if (window.slagent === undefined) {
      return null
    }
    return new API(window.slagent, log)
  }
}

// toJS returns a plain object as it is, even when its fields hold proxies, so the walk goes through plain objects and arrays too.
function plain<T>(value: T): T {
  const unwrapped = toJS(value)
  if (Array.isArray(unwrapped)) {
    return unwrapped.map(plain) as T
  }
  if (unwrapped !== null && typeof unwrapped === "object" && Object.getPrototypeOf(unwrapped) === Object.prototype) {
    return Object.fromEntries(Object.entries(unwrapped).map(([key, field]) => [key, plain(field)])) as T
  }
  return unwrapped
}

function timed(bridge: SlagentApi, log: Log): SlagentApi {
  const wrapped: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(bridge)) {
    if (typeof value !== "function" || UNTIMED.includes(name)) {
      wrapped[name] = value
      continue
    }
    const call = value as (...args: unknown[]) => unknown
    wrapped[name] = (...args: unknown[]) => log.span(name, () => call(...args), { args })
  }
  return wrapped as SlagentApi
}
