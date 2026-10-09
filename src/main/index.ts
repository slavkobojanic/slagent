import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { randomUUID } from "node:crypto"
import { app, BrowserWindow, nativeImage, net, Notification, protocol, shell } from "electron"
import type { TerminalEvent } from "../shared/types"
import { AgentHost } from "./host"
import { ComputerUse, computerExecutable } from "./computer"
import { McpManager } from "./mcp"
import { setApplicationMenu } from "./menu"
import { TerminalManager } from "./terminal"
import { startApiServer, type ApiServer } from "./server"
import { createCallHandler, systemOpenExternal } from "./calls"
import { runDaemon, handoffToApp, waitDaemonPortFree } from "./daemon"
import { daemonStatus, installDaemon, startDaemon, stopDaemon, uninstallDaemon } from "./daemon-launchd"
import { attachmentFile } from "./library"
import { startUpdater } from "./updater"
import type { DaemonStatus } from "../shared/types"

const devServerUrl = process.env.ELECTRON_RENDERER_URL

// The same app run with --daemon is the headless background server. It shares
// this entry so remote clients speak the exact same protocol however the Mac
// serves them.
const DAEMON = process.argv.includes("--daemon")

let host: AgentHost | null = null
let computer: ComputerUse | null = null
let mcp: McpManager | null = null
let terminal: TerminalManager | null = null
let apiServer: ApiServer | null = null
let quitting = false
let started: Promise<void> | null = null
// Windows the renderer's close confirmation has approved; a plain Cmd+W has to ask first.
const closeApproved = new WeakSet<BrowserWindow>()
// Folders from the slagent command, Finder and the Dock icon arrive as open-file
// events. The one that launches the app fires before ready, so it waits here.
const pendingFolders: string[] = []
// Each window passes a token in its socket URL, so menu items and notifications
// can find the client of the window they should act on.
const windowTokens = new Map<number, string>()
const clientByToken = new Map<string, string>()

app.on("open-file", (event, path) => {
  event.preventDefault()
  if (DAEMON) {
    // The daemon cannot open windows, so a user launch intent hands over to it.
    handoffToApp(path)
    return
  }
  if (started) void openFolderFromSystem(path)
  else pendingFolders.push(path)
})

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

function requireHost(): AgentHost {
  if (!host) throw new Error("Pi is not ready.")
  return host
}

function loadAppIcon() {
  // Must be the rounded artwork: app.dock.setIcon() replaces the bundle icns at
  // runtime, so feeding it the raw square artwork undoes the baked mask.
  const packaged = nativeImage.createFromPath(join(process.resourcesPath, "icon-rounded.png"))
  if (!packaged.isEmpty()) return packaged
  return nativeImage.createFromPath(join(app.getAppPath(), "resources", "icon-rounded.png"))
}

function createWindow(): BrowserWindow {
  let titleBarStyle: "default" | "hiddenInset" = "default"
  if (process.platform === "darwin") titleBarStyle = "hiddenInset"

  const icon = loadAppIcon()
  const args = serverArguments()
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
      additionalArguments: args,
    },
  })

  windowTokens.set(win.id, slagentArgument(args, "window"))

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

  // Cmd+W (and every other close) asks the renderer for a confirmation first.
  // A real quit sets `quitting` before the close events fire, so it passes.
  win.on("close", (event) => {
    if (quitting || closeApproved.has(win)) return
    event.preventDefault()
    const clientId = clientIdOfWindow(win)
    if (clientId) apiServer?.hub.publishCloseRequest(clientId)
  })

  win.on("closed", () => {
    windowTokens.delete(win.id)
  })

  return win
}

// Connection details for the preload's websocket, passed as
// --slagent-key=value switches: Chromium's switch parser keeps those whole.
function serverArguments(): string[] {
  const info = apiServer?.info
  if (!info) return []
  return [
    `--slagent-port=${info.port}`,
    `--slagent-token=${info.token}`,
    `--slagent-client=${randomUUID()}`,
    `--slagent-window=${randomUUID()}`,
  ]
}

function slagentArgument(args: string[], key: string): string {
  const found = args.find((arg) => arg.startsWith(`--slagent-${key}=`))
  return found ? found.slice(`--slagent-${key}=`.length) : ""
}

function clientIdOfWindow(win: BrowserWindow | null): string | null {
  if (!win) return null
  const token = windowTokens.get(win.id)
  return token ? clientByToken.get(token) ?? null : null
}

function windowOfClient(clientId: string): BrowserWindow | null {
  for (const [winId, token] of windowTokens) {
    if (clientByToken.get(token) === clientId) return BrowserWindow.fromId(winId) ?? null
  }
  return null
}

// Menu items and notifications act on the window the user is in.
function focusedClientId(): string | null {
  return clientIdOfWindow(BrowserWindow.getFocusedWindow())
}

function primaryClientId(): string | null {
  return clientIdOfWindow(BrowserWindow.getAllWindows()[0] ?? null)
}

// A window that was just created needs a moment to open its socket.
async function anyClientId(): Promise<string | null> {
  for (let waited = 0; waited < 50; waited += 1) {
    const clientId = focusedClientId() ?? primaryClientId()
    if (clientId) return clientId
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return null
}

async function openFolderFromSystem(folder: string): Promise<void> {
  await started
  const clientId = await anyClientId()
  if (!clientId) return
  await requireHost()
    .openFolder(clientId, folder)
    .catch((error) => console.error("open folder:", error))
}

const calls = createCallHandler({
  host: () => {
    if (!host) throw new Error("Pi is not ready.")
    return host
  },
  computer: () => computer,
  mcp: () => mcp,
  terminal: () => terminal,
  desktop: true,
  openExternal: systemOpenExternal,
  closeWindow: (clientId) => {
    const win = windowOfClient(clientId)
    if (win) {
      closeApproved.add(win)
      win.close()
    }
  },
})

// Settings for the daemon live here, not in calls.ts, because only the desktop
// app can install or remove the LaunchAgent.
const daemonMethods = new Set(["daemonStatus", "enableDaemon", "disableDaemon"])

async function handleDaemonCall(method: string): Promise<DaemonStatus> {
  if (process.platform !== "darwin") return { supported: false, installed: false, running: false }
  switch (method) {
    case "daemonStatus":
      return daemonStatus()
    case "enableDaemon":
      await installDaemon(daemonProgram())
      return daemonStatus()
    case "disableDaemon":
      await uninstallDaemon()
      return daemonStatus()
    default:
      throw new Error(`Unknown method: ${method}`)
  }
}

// The LaunchAgent runs this same app headless, so the daemon speaks the same
// protocol over the same port and the phone notices nothing when they trade places.
function daemonProgram(): { program: string; args: string[]; logPath: string } {
  const appPath = app.isPackaged ? join(process.resourcesPath, "app.asar") : app.getAppPath()
  return {
    program: process.execPath,
    args: [appPath, "--daemon"],
    logPath: join(app.getPath("userData"), "daemon.log"),
  }
}


app.whenReady().then(async () => {
  if (DAEMON) {
    // The daemon never opens windows, so a click on its (hidden) app or any
    // other launch intent means the real app should take over.
    app.on("activate", () => handoffToApp())
    await runDaemon()
    return
  }

  // When the daemon is serving the phone, it owns the port; stop it and let
  // it finish writing before the app binds, so the phone keeps one address.
  const daemon = await daemonStatus().catch(() => null)
  if (daemon?.installed) {
    await stopDaemon().catch((error) => console.error("daemon:", error))
    await waitDaemonPortFree(8747, 10_000)
  }

  const icon = loadAppIcon()
  if (app.dock && !icon.isEmpty()) app.dock.setIcon(icon)

  const libraryRoot = join(app.getPath("userData"), "library")
  protocol.handle("slagent", (request) => serveAttachment(libraryRoot, request))
  computer = new ComputerUse(computerExecutable(app.getAppPath(), process.resourcesPath))
  mcp = new McpManager({
    configPath: join(app.getPath("userData"), "mcp.json"),
    openUrl: (url) => shell.openExternal(url),
  })
  await mcp.start().catch((error) => console.error("mcp:", error))

  host = new AgentHost(
    join(app.getPath("userData"), "settings.json"),
    libraryRoot,
    (clientId, event) => apiServer?.hub.publish(clientId, event),
    computer,
    {
      focused: (projectId, chatId) => {
        const clientId = focusedClientId()
        return Boolean(clientId && host?.isViewedBy(clientId, projectId, chatId))
      },
      notify: ({ title, body, projectId, chatId }) => {
        if (!Notification.isSupported()) return
        const note = new Notification({ title, body, silent: false })
        note.on("click", () => {
          void (async () => {
            const clientId = await anyClientId()
            if (!clientId) return
            await host?.openChat(clientId, chatId, projectId).catch(() => undefined)
          })()
        })
        note.show()
      },
      badge: (count) => {
        if (process.platform !== "darwin") return
        app.setBadgeCount(count)
      },
    },
    () => mcp?.serversForSession() ?? {},
    () => apiServer?.info ?? null,
  )

  terminal = new TerminalManager((event: TerminalEvent) => apiServer?.hub.publishTerminal(event), () => host?.getCwd() ?? "")

  try {
    apiServer = await startApiServer({
      statePath: join(app.getPath("userData"), "slagent-server.json"),
      onCall: (clientId, method, params) =>
        daemonMethods.has(method) ? handleDaemonCall(method) : calls.onCall(clientId, method, params),
      onCallSent: calls.onCallSent,
      onClient: (clientId, windowToken) => {
        if (windowToken) clientByToken.set(windowToken, clientId)
        host?.attach(clientId)
      },
      onClientGone: (clientId) => {
        host?.detach(clientId)
        for (const [token, id] of clientByToken) {
          if (id === clientId) clientByToken.delete(token)
        }
      },
      attachmentFile: (parts) => attachmentFile(libraryRoot, parts),
      onInfo: () => host?.refreshMeta(),
    })
  } catch (error) {
    console.error("api server:", error)
  }

  setApplicationMenu(() => createWindow())
  createWindow()
  started = host.start()
  for (const folder of pendingFolders.splice(0)) void openFolderFromSystem(folder)
  startUpdater({
    prepareQuit: async () => {
      quitting = true
      await (host?.flush() ?? Promise.resolve())
      host?.close()
      computer?.stop()
      terminal?.stop()
      apiServer?.close()
      await handOffToDaemon()
    },
    onReady: (version) => apiServer?.hub.publishUpdateReady(version),
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  // No window can show a shell, so none of them outlive it.
  terminal?.stop()
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  const pending = host?.flush() ?? Promise.resolve()
  void pending.finally(async () => {
    host?.close()
    computer?.stop()
    terminal?.stop()
    apiServer?.close()
    await handOffToDaemon()
    app.quit()
  })
})

// Quitting the app hands the server over to the daemon, when it is installed.
async function handOffToDaemon(): Promise<void> {
  const status = await daemonStatus().catch(() => null)
  if (status?.installed) await startDaemon().catch((error) => console.error("daemon:", error))
}

function serveAttachment(libraryRoot: string, request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== "attachment") return Promise.resolve(new Response("Not found", { status: 404 }))
  let parts: string[]
  try {
    parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part))
  } catch {
    return Promise.resolve(new Response("Not found", { status: 404 }))
  }
  const file = attachmentFile(libraryRoot, parts)
  if (!file) return Promise.resolve(new Response("Not found", { status: 404 }))
  return net.fetch(pathToFileURL(file).href).catch(() => new Response("Not found", { status: 404 }))
}
