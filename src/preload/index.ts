import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"
import { channels, type SlagentApi, type UiEvent } from "../shared/types"

const api: SlagentApi = {
  platform: process.platform,
  getSnapshot: () => ipcRenderer.invoke(channels.snapshot),
  prompt: (text) => ipcRenderer.invoke(channels.prompt, text),
  abort: () => ipcRenderer.invoke(channels.abort),
  newSession: () => ipcRenderer.invoke(channels.newSession),
  chooseFolder: () => ipcRenderer.invoke(channels.chooseFolder),
  setModel: (modelId) => ipcRenderer.invoke(channels.setModel, modelId),
  saveOpenRouterKey: (apiKey) => ipcRenderer.invoke(channels.saveKey, apiKey),
  logoutOpenRouter: () => ipcRenderer.invoke(channels.logout),
  openExternal: (url) => ipcRenderer.invoke(channels.openExternal, url),
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
