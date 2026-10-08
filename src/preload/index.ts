import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from "electron"
import { channels, type SlagentApi, type UiEvent } from "../shared/types"

const api: SlagentApi = {
  platform: process.platform,
  systemVersion: process.getSystemVersion(),
  getSnapshot: () => ipcRenderer.invoke(channels.snapshot),
  prompt: (request) => ipcRenderer.invoke(channels.prompt, request),
  abort: () => ipcRenderer.invoke(channels.abort),
  newChat: () => ipcRenderer.invoke(channels.newChat),
  openProject: (projectId) => ipcRenderer.invoke(channels.openProject, projectId),
  openChat: (chatId, projectId, messageId) => ipcRenderer.invoke(channels.openChat, chatId, projectId, messageId),
  pageTranscript: (page) => ipcRenderer.invoke(channels.pageTranscript, page),
  searchChats: (query) => ipcRenderer.invoke(channels.searchChats, query),
  pinProject: (projectId, pinned) => ipcRenderer.invoke(channels.pinProject, projectId, pinned),
  pinChat: (chatId, pinned) => ipcRenderer.invoke(channels.pinChat, chatId, pinned),
  renameChat: (chatId, title) => ipcRenderer.invoke(channels.renameChat, chatId, title),
  deleteChat: (chatId) => ipcRenderer.invoke(channels.deleteChat, chatId),
  readTranscript: (chatId) => ipcRenderer.invoke(channels.readTranscript, chatId),
  removeProject: (projectId, typedName) => ipcRenderer.invoke(channels.removeProject, projectId, typedName),
  searchFiles: (query) => ipcRenderer.invoke(channels.searchFiles, query),
  listCommands: () => ipcRenderer.invoke(channels.listCommands),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ""
    }
  },
  chooseFolder: () => ipcRenderer.invoke(channels.chooseFolder),
  setModel: (modelId) => ipcRenderer.invoke(channels.setModel, modelId),
  setRouting: (routing) => ipcRenderer.invoke(channels.setRouting, routing),
  saveOpenRouterKey: (apiKey) => ipcRenderer.invoke(channels.saveKey, apiKey),
  logoutOpenRouter: () => ipcRenderer.invoke(channels.logout),
  openExternal: (url) => ipcRenderer.invoke(channels.openExternal, url),
  openInEditor: (path) => ipcRenderer.invoke(channels.openInEditor, path),
  readFile: (path) => ipcRenderer.invoke(channels.readFile, path),
  setQueueMode: (id, mode) => ipcRenderer.invoke(channels.setQueueMode, id, mode),
  removeQueued: (id) => ipcRenderer.invoke(channels.removeQueued, id),
  editMessage: (id, text) => ipcRenderer.invoke(channels.editMessage, id, text),
  setPlanMode: (enabled) => ipcRenderer.invoke(channels.setPlanMode, enabled),
  approvePlan: () => ipcRenderer.invoke(channels.approvePlan),
  answerQuestion: (id, reply) => ipcRenderer.invoke(channels.answerQuestion, id, reply),
  rewind: (id, mode) => ipcRenderer.invoke(channels.rewind, id, mode),
  undoRewind: (commit) => ipcRenderer.invoke(channels.undoRewind, commit),
  taskOutput: (id) => ipcRenderer.invoke(channels.taskOutput, id),
  stopTask: (id) => ipcRenderer.invoke(channels.stopTask, id),
  gitStatus: () => ipcRenderer.invoke(channels.gitStatus),
  gitDiff: (scope) => ipcRenderer.invoke(channels.gitDiff, scope),
  gitCommit: (message) => ipcRenderer.invoke(channels.gitCommit, message),
  gitPush: () => ipcRenderer.invoke(channels.gitPush),
  gitPullRequest: () => ipcRenderer.invoke(channels.gitPullRequest),
  gitCommitMessage: () => ipcRenderer.invoke(channels.gitCommitMessage),
  compact: () => ipcRenderer.invoke(channels.compact),
  getPermissions: () => ipcRenderer.invoke(channels.permissions),
  requestAccessibility: () => ipcRenderer.invoke(channels.requestAccessibility),
  requestScreenRecording: () => ipcRenderer.invoke(channels.requestScreenRecording),
  openPermissionSettings: (pane) => ipcRenderer.invoke(channels.openPermissionSettings, pane),
  mcpList: () => ipcRenderer.invoke(channels.mcpList),
  mcpSignIn: (name) => ipcRenderer.invoke(channels.mcpSignIn, name),
  mcpSignOut: (name) => ipcRenderer.invoke(channels.mcpSignOut, name),
  mcpSetEnabled: (name, enabled) => ipcRenderer.invoke(channels.mcpSetEnabled, name, enabled),
  onEvent: (listener) => {
    const wrapped = (_event: IpcRendererEvent, payload: UiEvent) => {
      listener(payload)
    }
    ipcRenderer.on(channels.event, wrapped)
    return () => {
      ipcRenderer.off(channels.event, wrapped)
    }
  },
  updateStatus: () => ipcRenderer.invoke(channels.updateStatus),
  installUpdate: () => ipcRenderer.invoke(channels.installUpdate),
  onUpdateReady: (listener) => {
    const wrapped = (_event: IpcRendererEvent, version: string) => {
      listener(version)
    }
    ipcRenderer.on(channels.updateReady, wrapped)
    return () => {
      ipcRenderer.off(channels.updateReady, wrapped)
    }
  },
  cliStatus: () => ipcRenderer.invoke(channels.cliStatus),
  installCli: () => ipcRenderer.invoke(channels.cliInstall),
  uninstallCli: () => ipcRenderer.invoke(channels.cliUninstall),
  setPersonalisation: (value) => ipcRenderer.invoke(channels.setPersonalisation, value),
  pickContextFiles: () => ipcRenderer.invoke(channels.pickContextFiles),
}

contextBridge.exposeInMainWorld("slagent", api)
