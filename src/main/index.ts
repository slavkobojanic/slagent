import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, BrowserWindow, dialog, ipcMain, nativeImage, net, protocol, shell } from "electron"
import { channels } from "../shared/types"
import { AgentHost } from "./host"
import { ComputerUse, computerExecutable } from "./computer"
import { parsePrompt } from "./prompt"

const devServerUrl = process.env.ELECTRON_RENDERER_URL

let host: AgentHost | null = null
let computer: ComputerUse | null = null
let quitting = false

protocol.registerSchemesAsPrivileged([
  {
    scheme: "slagent",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const permissionSettings = {
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  screen: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
} as const

function broadcast(event: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channels.event, event)
  }
}

function requireHost(): AgentHost {
  if (!host) throw new Error("Pi is not ready.")
  return host
}

function requireComputer(): ComputerUse {
  if (!computer) throw new Error("Computer use is not ready.")
  return computer
}

function loadAppIcon() {
  const packaged = nativeImage.createFromPath(join(process.resourcesPath, "icon.png"))
  if (!packaged.isEmpty()) return packaged
  return nativeImage.createFromPath(join(app.getAppPath(), "resources", "icon.png"))
}

function createWindow(): BrowserWindow {
  let titleBarStyle: "default" | "hiddenInset" = "default"
  if (process.platform === "darwin") titleBarStyle = "hiddenInset"

  const icon = loadAppIcon()
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 880,
    minHeight: 640,
    title: "slagent",
    backgroundColor: "#000000",
    titleBarStyle,
    trafficLightPosition: { x: 14, y: 17 },
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once("ready-to-show", () => {
    win.show()
  })

  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("preload-error", preloadPath, error)
  })
  win.webContents.on("did-fail-load", (_event, code, description) => {
    console.error("did-fail-load", code, description)
  })
  win.webContents.on("console-message", (event) => {
    if (event.level !== "error") return
    console.error("renderer", event.message)
  })

  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) void shell.openExternal(url)
    return { action: "deny" }
  })

  return win
}

function registerIpc(): void {
  ipcMain.handle(channels.snapshot, () => requireHost().getSnapshot())
  ipcMain.handle(channels.prompt, (_event, request: unknown) => requireHost().prompt(parsePrompt(request)))
  ipcMain.handle(channels.abort, () => requireHost().abort())
  ipcMain.handle(channels.newChat, () => requireHost().newChat())
  ipcMain.handle(channels.openProject, (_event, projectId: string) => requireHost().openProject(projectId))
  ipcMain.handle(channels.openChat, (_event, chatId: string) => requireHost().openChat(chatId))
  ipcMain.handle(channels.pinProject, (_event, projectId: string, pinned: boolean) => {
    return requireHost().pinProject(projectId, pinned)
  })
  ipcMain.handle(channels.pinChat, (_event, chatId: string, pinned: boolean) => {
    return requireHost().pinChat(chatId, pinned)
  })
  ipcMain.handle(channels.renameChat, (_event, chatId: string, title: string) => {
    return requireHost().renameChat(chatId, title)
  })
  ipcMain.handle(channels.deleteChat, (_event, chatId: string) => requireHost().deleteChat(chatId))
  ipcMain.handle(channels.readTranscript, (_event, chatId: string) => requireHost().readTranscript(chatId))
  ipcMain.handle(channels.removeProject, (_event, projectId: string, typedName: string) => {
    return requireHost().removeProject(projectId, typedName)
  })
  ipcMain.handle(channels.searchFiles, (_event, query: string) => requireHost().searchFiles(query))
  ipcMain.handle(channels.listCommands, () => requireHost().listCommands())
  ipcMain.handle(channels.setModel, (_event, modelId: string) => requireHost().setModel(modelId))
  ipcMain.handle(channels.saveKey, (_event, apiKey: string) => requireHost().saveOpenRouterKey(apiKey))
  ipcMain.handle(channels.logout, () => requireHost().logoutOpenRouter())
  ipcMain.handle(channels.setQueueMode, (_event, id: string, mode: string) => {
    if (mode !== "follow-up" && mode !== "steer") throw new Error("Unknown queue mode.")
    return requireHost().setQueueMode(id, mode)
  })
  ipcMain.handle(channels.removeQueued, (_event, id: string) => {
    requireHost().removeQueued(id)
  })
  ipcMain.handle(channels.clearTerminal, () => {
    requireHost().clearTerminal()
  })
  ipcMain.handle(channels.openExternal, (_event, url: string) => {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only web links can be opened.")
    }
    return shell.openExternal(parsed.toString())
  })
  ipcMain.handle(channels.chooseFolder, async () => {
    const current = requireHost()
    const cwd = current.getCwd()
    const result = await dialog.showOpenDialog({
      title: "Choose a folder",
      defaultPath: cwd || undefined,
      properties: ["openDirectory", "createDirectory"],
    })
    const folder = result.filePaths[0]
    if (result.canceled || !folder) return
    await current.openFolder(folder)
  })
  ipcMain.handle(channels.permissions, () => requireComputer().permissions())
  ipcMain.handle(channels.requestAccessibility, () => requireComputer().requestAccessibility())
  ipcMain.handle(channels.requestScreenRecording, () => requireComputer().requestScreenRecording())
  ipcMain.handle(channels.openPermissionSettings, (_event, pane: string) => {
    if (pane !== "accessibility" && pane !== "screen") throw new Error("Unknown permission.")
    return shell.openExternal(permissionSettings[pane])
  })
}

app.whenReady().then(() => {
  const icon = loadAppIcon()
  if (app.dock && !icon.isEmpty()) app.dock.setIcon(icon)

  const libraryRoot = join(app.getPath("userData"), "library")
  protocol.handle("slagent", (request) => serveAttachment(libraryRoot, request))
  computer = new ComputerUse(computerExecutable(app.getAppPath(), process.resourcesPath))
  registerIpc()
  host = new AgentHost(join(app.getPath("userData"), "settings.json"), libraryRoot, broadcast, computer)
  createWindow()
  void host.start()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  const pending = host?.flush() ?? Promise.resolve()
  void pending.finally(() => {
    host?.close()
    computer?.stop()
    app.quit()
  })
})

function serveAttachment(libraryRoot: string, request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== "attachment") return Promise.resolve(new Response("Not found", { status: 404 }))
  const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part))
  if (parts.length !== 3) return Promise.resolve(new Response("Not found", { status: 404 }))
  if (parts.some((part) => part.includes("..") || part.includes("/") || part.includes("\\"))) {
    return Promise.resolve(new Response("Not found", { status: 404 }))
  }
  const file = join(libraryRoot, "projects", parts[0], "chats", parts[1], "attachments", parts[2])
  if (!file.startsWith(join(libraryRoot, "projects"))) {
    return Promise.resolve(new Response("Not found", { status: 404 }))
  }
  return net.fetch(pathToFileURL(file).href).catch(() => new Response("Not found", { status: 404 }))
}
