import { execFile, spawn } from "node:child_process"
import { connect } from "node:net"
import { join } from "node:path"
import { app } from "electron"
import type { ComputerPermissions, ComputerUse } from "./computer"
import { createCallHandler, systemOpenExternal } from "./calls"
import { AgentHost } from "./host"
import { attachmentFile } from "./library"
import { McpManager } from "./mcp"
import { startApiServer, type ApiServer } from "./server"
import { TerminalManager } from "./terminal"
import { appVersion } from "./version"

let host: AgentHost | null = null
let mcp: McpManager | null = null
let terminal: TerminalManager | null = null
let apiServer: ApiServer | null = null
let started: Promise<void> = Promise.resolve()

// Computer use drives the screen through the app's own window, so the daemon
// reports it as unavailable instead of failing differently deeper down.
const DENIED: ComputerPermissions = {
  accessibility: false,
  screenRecording: false,
  error: "Computer use needs the slagent app open.",
}

function headlessComputer(): ComputerUse {
  return {
    permissions: () => Promise.resolve(DENIED),
    requestAccessibility: () => Promise.resolve(DENIED),
    requestScreenRecording: () => Promise.resolve(DENIED),
    call: () => Promise.reject(new Error("Computer use needs the slagent app open.")),
    stop: () => undefined,
  } as unknown as ComputerUse
}

// The same app run headless with --daemon: it builds the host and the websocket
// server without windows, so phones keep working while the app is closed. Its
// console output lands in the daemon log launchd writes for it.
export async function runDaemon(): Promise<void> {
  app.dock?.hide()
  console.log(`slagent daemon ${appVersion} starting`)
  const userData = app.getPath("userData")
  const libraryRoot = join(userData, "library")
  mcp = new McpManager({ configPath: join(userData, "mcp.json"), openUrl: openLink })
  await mcp.start().catch((error) => console.error("mcp:", error))
  host = new AgentHost(
    join(userData, "settings.json"),
    libraryRoot,
    (clientId, event) => apiServer?.hub.publish(clientId, event),
    headlessComputer(),
    {
      focused: () => false,
      notify: ({ title, body }) => console.log(`notification: ${title}: ${body}`),
      badge: () => undefined,
    },
    () => mcp?.serversForSession() ?? {},
    () => apiServer?.info ?? null,
  )
  terminal = new TerminalManager((event) => apiServer?.hub.publishTerminal(event), () => host?.getCwd() ?? "")
  const calls = createCallHandler({
    host: () => {
      if (!host) throw new Error("Pi is not ready.")
      return host
    },
    computer: () => null,
    mcp: () => mcp,
    terminal: () => terminal,
    desktop: false,
    openExternal: systemOpenExternal,
    closeWindow: () => undefined,
  })
  try {
    apiServer = await startApiServer({
      statePath: join(userData, "slagent-server.json"),
      onCall: calls.onCall,
      onCallSent: calls.onCallSent,
      onClient: (clientId) => host?.attach(clientId),
      onClientGone: (clientId) => host?.detach(clientId),
      attachmentFile: (parts) => attachmentFile(libraryRoot, parts),
      onInfo: () => host?.refreshMeta(),
    })
  } catch (error) {
    console.error("api server:", error)
    app.exit(1)
    return
  }
  started = host.start()
  console.log(
    `slagent daemon listening on ${apiServer.info.host}:${apiServer.info.port}` +
      (apiServer.info.tailscale ? " (on the tailnet)" : " (localhost only; start Tailscale)"),
  )

  // launchd sends SIGTERM to stop or replace the daemon; flush the library
  // first so the app or the next daemon run finds every chat written.
  process.on("SIGTERM", () => {
    console.log("slagent daemon stopping")
    void flush().finally(() => app.exit(0))
  })
  process.on("SIGINT", () => {
    void flush().finally(() => app.exit(0))
  })
}

async function flush(): Promise<void> {
  await started
  await host?.flush()
  host?.close()
  terminal?.stop()
  apiServer?.close()
}

// The daemon is a background app, so a user launch intent (Dock click, an open
// event) means the real app should take over: the daemon quits and the app
// starts once the port is free.
export function handoffToApp(folder?: string): void {
  console.log(`slagent daemon handing over to the app${folder ? ` (${folder})` : ""}`)
  const command = folder
    ? `sleep 2; open -b com.slagent.app "$(cd "$1" && pwd -P)"`
    : "sleep 2; open -b com.slagent.app"
  const child = spawn("/bin/sh", ["-c", command, "sh", ...(folder ? [folder] : [])], { detached: true, stdio: "ignore" })
  child.unref()
  void flush().finally(() => app.exit(0))
}

// The app takes the port over from the daemon, so it waits until the daemon
// has released it before binding, otherwise it lands on the next port and
// already-connected phones would look at the old address.
export async function waitDaemonPortFree(port: number, timeoutMs: number): Promise<void> {
  for (let waited = 0; waited < timeoutMs; waited += 250) {
    if (await portFree(port)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1")
    socket.once("connect", () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("error", () => {
      socket.destroy()
      resolve(true)
    })
  })
}

// MCP sign-in needs a browser; the daemon opens it with the system's own
// launcher, which needs no app or window.
function openLink(url: string): void {
  execFile("/usr/bin/open", [url], () => undefined)
}
