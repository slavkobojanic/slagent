import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { randomUUID } from "node:crypto"
import { app, BrowserWindow, dialog, nativeImage, net, Notification, protocol, shell } from "electron"
import type { CreateSkillInput, DraftSkillInput, EffortLevel, ModelRouting, Personalisation, TerminalEvent } from "../shared/types"
import { AgentHost } from "./host"
import { ComputerUse, computerExecutable } from "./computer"
import { McpManager } from "./mcp"
import { openInEditor, readFileView } from "./editor"
import { parsePrompt } from "./prompt"
import { parseReply } from "./extensions/ask-user"
import { startUpdater, installUpdate, updateStatus, checkForUpdates, appVersion } from "./updater"
import { setApplicationMenu } from "./menu"
import { cliStatus, installCli, uninstallCli } from "./cli"
import { TerminalManager } from "./terminal"
import { startApiServer, type ApiServer } from "./server"

const devServerUrl = process.env.ELECTRON_RENDERER_URL

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

const permissionSettings = {
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  screen: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
} as const

function requireHost(): AgentHost {
  if (!host) throw new Error("Pi is not ready.")
  return host
}

function requireTerminal(): TerminalManager {
  if (!terminal) throw new Error("The terminal is not ready.")
  return terminal
}

function requireComputer(): ComputerUse {
  if (!computer) throw new Error("Computer use is not ready.")
  return computer
}

function requireMcp(): McpManager {
  if (!mcp) throw new Error("MCP is not ready.")
  return mcp
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

function str(value: unknown): string {
  if (typeof value !== "string") throw new Error("Bad argument.")
  return value
}

function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined
}

// Every websocket call from a client lands here, with the caller's identity
// first so the host can scope the call to that client's session.
async function handleCall(clientId: string, method: string, params: unknown[]): Promise<unknown> {
  const host = requireHost()
  switch (method) {
    case "getSnapshot":
      return host.getSnapshot(clientId)
    case "prompt":
      return host.prompt(clientId, parsePrompt(params[0]))
    case "abort":
      return host.abort(clientId)
    case "newChat":
      return host.newChat(clientId, optStr(params[0]))
    case "openProject":
      return host.openProject(clientId, str(params[0]))
    case "openChat":
      return host.openChat(clientId, str(params[0]), optStr(params[1]), optStr(params[2]))
    case "pageTranscript": {
      const page = params[0]
      if (page !== "older" && page !== "newer" && page !== "latest") throw new Error("Unknown page.")
      return host.pageTranscript(clientId, page)
    }
    case "searchChats":
      return host.searchChats(String(params[0] ?? ""))
    case "pinProject":
      return host.pinProject(clientId, str(params[0]), params[1] === true)
    case "pinChat":
      return host.pinChat(clientId, str(params[0]), params[1] === true, optStr(params[2]))
    case "renameChat":
      return host.renameChat(clientId, str(params[0]), str(params[1]), optStr(params[2]))
    case "deleteChat":
      return host.deleteChat(clientId, str(params[0]), optStr(params[1]))
    case "readTranscript":
      return host.readTranscript(clientId, str(params[0]), optStr(params[1]))
    case "removeProject":
      return host.removeProject(clientId, str(params[0]), str(params[1]))
    case "searchFiles":
      return host.searchFiles(clientId, String(params[0] ?? ""))
    case "listCommands":
      return host.listCommands(clientId)
    case "draftSkill":
      return host.draftSkill(clientId, params[0] as DraftSkillInput)
    case "createSkill":
      return host.createSkill(clientId, params[0] as CreateSkillInput)
    case "createChatProject":
      return host.createChatProject(clientId)
    case "chooseFolder": {
      const result = await dialog.showOpenDialog({
        title: "Choose a folder",
        defaultPath: host.getCwd() || undefined,
        properties: ["openDirectory", "createDirectory"],
      })
      const folder = result.filePaths[0]
      if (result.canceled || !folder) return
      await host.openFolder(clientId, folder)
      return
    }
    case "setModel":
      return host.setModel(clientId, str(params[0]))
    case "setTitleModel":
      return host.setTitleModel(String(params[0] ?? ""))
    case "setRouting":
      return host.setRouting(params[0] as ModelRouting)
    case "setEffort":
      return host.setEffort(params[0] as EffortLevel)
    case "saveOpenRouterKey":
      return host.saveOpenRouterKey(str(params[0]))
    case "logoutOpenRouter":
      return host.logoutOpenRouter()
    case "setQueueMode": {
      const mode = params[1]
      if (mode !== "follow-up" && mode !== "steer") throw new Error("Unknown queue mode.")
      return host.setQueueMode(clientId, str(params[0]), mode)
    }
    case "editMessage": {
      const text = params[1]
      if (typeof text !== "string" || !text.trim()) throw new Error("Write a message first.")
      return host.editMessage(clientId, str(params[0]), text)
    }
    case "setPlanMode":
      return host.setPlanMode(clientId, params[0] === true)
    case "approvePlan":
      return host.approvePlan(clientId)
    case "answerQuestion":
      return host.answerQuestion(clientId, str(params[0]), parseReply(params[1]))
    case "rewind": {
      const mode = params[1]
      if (mode !== "both" && mode !== "chat" && mode !== "code") throw new Error("Unknown rewind.")
      return host.rewind(clientId, str(params[0]), mode)
    }
    case "undoRewind": {
      const commit = params[0]
      if (typeof commit !== "string" || !/^[0-9a-f]{7,64}$/.test(commit)) throw new Error("Unknown checkpoint.")
      return host.undoRewind(clientId, commit)
    }
    case "taskOutput":
      return host.taskOutput(clientId, str(params[0]))
    case "stopTask":
      return host.stopTask(clientId, str(params[0]))
    case "gitStatus":
      return host.gitStatus(clientId)
    case "gitDiff":
      return host.gitDiff(clientId, params[0] === "turn" ? "turn" : "uncommitted")
    case "gitCommit":
      return host.gitCommit(clientId, String(params[0] ?? ""))
    case "gitPush":
      return host.gitPush(clientId)
    case "gitPullRequest":
      return host.gitPullRequest(clientId)
    case "gitCommitMessage":
      return host.gitCommitMessage(clientId)
    case "removeQueued":
      host.removeQueued(clientId, str(params[0]))
      return
    case "compact":
      return host.compact(clientId)
    case "openExternal": {
      const parsed = new URL(str(params[0]))
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Only web links can be opened.")
      }
      return shell.openExternal(parsed.toString())
    }
    case "openInEditor":
      return openInEditor(host.getCwd(), str(params[0]))
    case "readFile":
      return readFileView(host.getCwd(), str(params[0]))
    case "getPermissions":
      return requireComputer().permissions()
    case "requestAccessibility":
      return requireComputer().requestAccessibility()
    case "requestScreenRecording":
      return requireComputer().requestScreenRecording()
    case "openPermissionSettings": {
      const pane = str(params[0])
      if (pane !== "accessibility" && pane !== "screen") throw new Error("Unknown permission.")
      return shell.openExternal(permissionSettings[pane])
    }
    case "mcpList":
      return requireMcp().list()
    case "mcpSignIn":
      return requireMcp().signIn(requireName(params[0]))
    case "mcpSignOut":
      return requireMcp().signOut(requireName(params[0]))
    case "mcpSetEnabled":
      return requireMcp().setEnabled(requireName(params[0]), params[1] === true)
    case "usageStats":
      return host.usageStats()
    case "terminalCreate":
      return requireTerminal().create()
    case "updateStatus":
      return updateStatus()
    case "updateCheck":
      return checkForUpdates()
    case "installUpdate":
      return installUpdate()
    case "appVersion":
      return appVersion
    case "closeApp": {
      const win = windowOfClient(clientId)
      if (win) {
        closeApproved.add(win)
        win.close()
      }
      return
    }
    case "cliStatus":
      return cliStatus()
    case "installCli":
      return installCli()
    case "uninstallCli":
      return uninstallCli()
    case "setPersonalisation":
      return host.setPersonalisation(params[0] as Personalisation)
    case "pickContextFiles":
      return host.pickContextFiles()
    default:
      throw new Error(`Unknown method: ${method}`)
  }
}

// Fire-and-forget calls: terminal keystrokes and drags.
function handleCallSent(_clientId: string, method: string, params: unknown[]): void {
  switch (method) {
    case "writeTerminal":
      if (typeof params[0] === "string" && typeof params[1] === "string") terminal?.write(params[0], params[1])
      return
    case "resizeTerminal":
      if (typeof params[0] === "string" && typeof params[1] === "number" && typeof params[2] === "number") {
        terminal?.resize(params[0], params[1], params[2])
      }
      return
    case "closeTerminal":
      if (typeof params[0] === "string") terminal?.close(params[0])
      return
    default:
      return
  }
}

function requireName(name: unknown): string {
  if (typeof name !== "string" || !name) throw new Error("Unknown MCP server.")
  return name
}

app.whenReady().then(async () => {
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
      onCall: handleCall,
      onCallSent: handleCallSent,
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
  void pending.finally(() => {
    host?.close()
    computer?.stop()
    terminal?.stop()
    apiServer?.close()
    app.quit()
  })
})

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

// [projectId, chatId, file] to the attachment's path, or null when the parts
// could leave the library's attachment folders.
function attachmentFile(libraryRoot: string, parts: string[]): string | null {
  if (parts.length !== 3) return null
  if (parts.some((part) => !part || part.includes("..") || part.includes("/") || part.includes("\\"))) return null
  const file = join(libraryRoot, "projects", parts[0]!, "chats", parts[1]!, "attachments", parts[2]!)
  if (!file.startsWith(join(libraryRoot, "projects"))) return null
  return file
}
