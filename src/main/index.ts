import { join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron"
import { channels } from "../shared/types"
import { AgentHost } from "./host"
import { ComputerUse, computerExecutable } from "./computer"

const devServerUrl = process.env.ELECTRON_RENDERER_URL

let host: AgentHost | null = null
let computer: ComputerUse | null = null

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

function createWindow(): BrowserWindow {
  let titleBarStyle: "default" | "hiddenInset" = "default"
  if (process.platform === "darwin") titleBarStyle = "hiddenInset"

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 880,
    minHeight: 640,
    title: "slagent",
    backgroundColor: "#000000",
    titleBarStyle,
    trafficLightPosition: { x: 14, y: 14 },
    autoHideMenuBar: true,
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
  ipcMain.handle(channels.prompt, (_event, text: string) => requireHost().prompt(text))
  ipcMain.handle(channels.abort, () => requireHost().abort())
  ipcMain.handle(channels.newSession, () => requireHost().newSession())
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
    const result = await dialog.showOpenDialog({
      title: "Choose a folder",
      defaultPath: current.getCwd(),
      properties: ["openDirectory", "createDirectory"],
    })
    const folder = result.filePaths[0]
    if (result.canceled || !folder) return
    await current.setCwd(folder)
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
  computer = new ComputerUse(computerExecutable(app.getAppPath(), process.resourcesPath))
  registerIpc()
  host = new AgentHost(join(app.getPath("userData"), "settings.json"), broadcast, computer)
  createWindow()
  void host.start()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  host?.close()
  computer?.stop()
})
