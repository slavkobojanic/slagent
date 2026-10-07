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
  openChat: (chatId) => ipcRenderer.invoke(channels.openChat, chatId),
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
  saveOpenRouterKey: (apiKey) => ipcRenderer.invoke(channels.saveKey, apiKey),
  logoutOpenRouter: () => ipcRenderer.invoke(channels.logout),
  openExternal: (url) => ipcRenderer.invoke(channels.openExternal, url),
  openInEditor: (path) => ipcRenderer.invoke(channels.openInEditor, path),
  setQueueMode: (id, mode) => ipcRenderer.invoke(channels.setQueueMode, id, mode),
  removeQueued: (id) => ipcRenderer.invoke(channels.removeQueued, id),
  clearTerminal: () => ipcRenderer.invoke(channels.clearTerminal),
  getPermissions: () => ipcRenderer.invoke(channels.permissions),
  requestAccessibility: () => ipcRenderer.invoke(channels.requestAccessibility),
  requestScreenRecording: () => ipcRenderer.invoke(channels.requestScreenRecording),
  openPermissionSettings: (pane) => ipcRenderer.invoke(channels.openPermissionSettings, pane),
  onEvent: (listener) => {
    const wrapped = (_event: IpcRendererEvent, payload: UiEvent) => {
      listener(payload)
    }
    ipcRenderer.on(channels.event, wrapped)
    return () => {
      ipcRenderer.off(channels.event, wrapped)
    }
  },
}

contextBridge.exposeInMainWorld("slagent", api)
