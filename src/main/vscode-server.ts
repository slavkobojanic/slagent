import { spawn as nodeSpawn, type ChildProcess } from "node:child_process"
import { randomBytes, randomUUID } from "node:crypto"
import { cp } from "node:fs/promises"
import { createServer as createHttpServer, type Server as HttpServer } from "node:http"
import { createServer, type AddressInfo } from "node:net"
import { join } from "node:path"
import type { EditorPrefs } from "../shared/editor"
import type { DiffComment } from "../shared/types"
import { errorData } from "./app-log"
import { forgetServer, recordServer, stopStaleServer } from "./stale-server"

const TAIL_LINES = 20

export type BridgeRoute = "/open" | "/command" | "/settings"

// Where the built server lives: next to the app's resources when packaged, in vendor/ in development.
export function distDir(options: { packaged: boolean; resourcesPath: string; appPath: string; platform: string; arch: string }): string {
  if (options.packaged) return join(options.resourcesPath, "vscode-server")
  return join(options.appPath, "vendor", "vscode-server", "dist", `${options.platform}-${options.arch}`)
}

export function serverArgs(options: { port: number; token: string; dataDir: string }): string[] {
  return [
    "out/server-main.js",
    "--host",
    "127.0.0.1",
    "--port",
    String(options.port),
    "--connection-token",
    options.token,
    "--server-data-dir",
    options.dataDir,
    "--extensions-dir",
    join(options.dataDir, "extensions"),
    // A closed editor frame leaves its extension host behind for the whole grace period (3 hours by
    // default), and a stale one still holds the bridge port, so it is kept short.
    "--reconnection-grace-time",
    "15",
    "--accept-server-license-terms",
    "--disable-telemetry",
  ]
}

// The page the editor frame loads. The folder opens as the workbench's workspace.
export function workbenchUrl(options: { port: number; token: string; folder: string }): string {
  const url = new URL(`http://127.0.0.1:${options.port}/`)
  url.searchParams.set("tkn", options.token)
  if (options.folder) url.searchParams.set("folder", options.folder)
  return url.toString()
}

// The settings slagent owns, in the workbench's own names.
export function editorSettings(prefs: EditorPrefs): Record<string, unknown> {
  return {
    "editor.fontSize": prefs.fontSize,
    "editor.tabSize": prefs.tabSize,
    "editor.wordWrap": prefs.wordWrap ? "on" : "off",
    "editor.minimap.enabled": prefs.minimap,
  }
}

// A question the bridge sends about code selected in the editor, checked before it reaches the app.
export function parseEditorComment(input: unknown): DiffComment | null {
  if (typeof input !== "object" || input === null) return null
  const record = input as Record<string, unknown>
  const line = Number(record.line)
  const endLine = Number(record.endLine)
  if (typeof record.path !== "string" || !record.path || typeof record.text !== "string" || !record.text.trim()) return null
  if (!Number.isInteger(line) || line < 1) return null
  return {
    id: randomUUID(),
    path: record.path,
    line,
    ...(Number.isInteger(endLine) && endLine > line ? { endLine } : {}),
    side: "new",
    code: typeof record.code === "string" ? record.code.slice(0, 2000) : "",
    text: record.text.slice(0, 4000),
  }
}

export type VscodeServerDeps = {
  dist: string
  dataDir: string
  // In development, copy the checked-in bridge into the generated server build before launch.
  bridgeExtensionDir?: string
  // Applied by the bridge when it starts, so the first paint already has the user's settings.
  settings?: () => Record<string, unknown>
  spawn?: (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => ChildProcess
  // The port tried first, so the workbench keeps one origin (and its storage) across launches.
  preferredPort?: number
  // Takes a preferred port, or none for any free one.
  freePort?: (preferred?: number) => Promise<number>
  fetch?: typeof fetch
  token?: () => string
  timeoutMs?: number
  bridgeTimeoutMs?: number
  // A question the user asked in the editor about the code they selected.
  onComment?: (comment: DiffComment) => void
  // Every diagnostic from the server lifecycle: start, exit, and its own output.
  onEvent?: (level: "info" | "warn", event: string, data: Record<string, unknown>) => void
}

// The editor's origin is its port, and the workbench keeps its web storage per origin (settings,
// extensions installed in the browser), so a fixed port keeps that storage across launches.
export const EDITOR_PORT = 47821

export function freePort(preferred = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", (error) => {
      if (preferred === 0) {
        reject(error)
        return
      }
      // The preferred port is taken, so any free one will do.
      resolve(freePort(0))
    })
    server.listen(preferred, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))))
    })
  })
}

// The cookie the workbench expects. The editor frame is cross-site to the app, so the browser
// would drop the cookie the server sets; the main process adds it to this server's requests instead.
export function withEditorCookie(url: string, headers: Record<string, string>, endpoint: { port: number; token: string } | null): Record<string, string> {
  if (endpoint === null || new URL(url).port !== String(endpoint.port)) return headers
  const cookie = `vscode-tkn=${endpoint.token}`
  return { ...headers, Cookie: headers.Cookie ? `${headers.Cookie}; ${cookie}` : cookie }
}

type Running = { port: number; token: string; bridgePort: number; bridgeToken: string; child: ChildProcess; host: HttpServer }

// Runs the vendored VS Code server for the editor. It starts on first use, listens on loopback only,
// and every request needs a random token; the bridge extension inside it has its own.
export class VscodeServer {
  private running: Promise<Running> | null = null
  private current: { port: number; token: string } | null = null

  constructor(private readonly deps: VscodeServerDeps) {}

  // The url for the editor frame, starting the server when it is not running yet.
  async url(folder: string): Promise<string> {
    const { port, token } = await this.start()
    return workbenchUrl({ port, token, folder })
  }

  async post(route: BridgeRoute, body: Record<string, unknown>): Promise<void> {
    const { bridgePort, bridgeToken } = await this.start()
    const request = this.deps.fetch ?? fetch
    // The bridge only starts listening once the workbench has connected, which can be after the
    // server is up, so a refused connection is retried for a while.
    const deadline = Date.now() + (this.deps.bridgeTimeoutMs ?? 30_000)
    for (;;) {
      let response: Response
      try {
        response = await request(`http://127.0.0.1:${bridgePort}${route}`, {
          method: "POST",
          headers: { "x-slagent-token": bridgeToken },
          body: JSON.stringify(body),
        })
      } catch (error) {
        if (Date.now() > deadline) throw error
        await new Promise((resolve) => setTimeout(resolve, 300))
        continue
      }
      if (!response.ok) throw new Error(`The editor refused the request (${response.status}).`)
      return
    }
  }

  get endpoint(): { port: number; token: string } | null {
    return this.current
  }

  get started(): boolean {
    return this.running !== null
  }

  stop(): void {
    const running = this.running
    this.running = null
    this.current = null
    void running
      ?.then(({ child, host }) => {
        child.kill()
        host.close()
      })
      .catch(() => undefined)
    void forgetServer(this.deps.dataDir).catch(() => undefined)
  }

  private start(): Promise<Running> {
    if (this.running === null) {
      this.running = this.launch().catch((error: unknown) => {
        // A failed start can be tried again by the next request.
        this.running = null
        throw error
      })
    }
    return this.running
  }

  private async launch(): Promise<Running> {
    const log = this.deps.onEvent ?? (() => undefined)
    // A server from a launch that was killed would still hold the stable port.
    await stopStaleServer(this.deps.dataDir).catch((error) => log("warn", "stale-server", errorData(error)))
    if (this.deps.bridgeExtensionDir) {
      await cp(this.deps.bridgeExtensionDir, join(this.deps.dist, "extensions", "slagent-bridge"), { recursive: true })
    }
    const pickPort = this.deps.freePort ?? freePort
    const makeToken = this.deps.token ?? (() => randomBytes(24).toString("hex"))
    const [port, bridgePort] = [await pickPort(this.deps.preferredPort ?? EDITOR_PORT), await pickPort()]
    const token = makeToken()
    const bridgeToken = makeToken()
    const host = await this.listenForBridge(bridgeToken)
    const hostPort = (host.address() as AddressInfo).port
    log("info", "start", { dist: this.deps.dist, port, bridgePort, hostPort, dataDir: this.deps.dataDir })
    const child = (this.deps.spawn ?? nodeSpawn)(join(this.deps.dist, "node"), serverArgs({ port, token, dataDir: this.deps.dataDir }), {
      cwd: this.deps.dist,
      env: {
        ...process.env,
        SLAGENT_BRIDGE_PORT: String(bridgePort),
        SLAGENT_BRIDGE_TOKEN: bridgeToken,
        SLAGENT_HOST_PORT: String(hostPort),
        SLAGENT_SETTINGS: JSON.stringify(this.deps.settings?.() ?? {}),
      },
    })
    // Reading the output both feeds the log and keeps the pipes drained; a
    // server blocked on a full stdout buffer would never become ready.
    const tail: string[] = []
    this.pipe(child.stdout, "info", tail, log)
    this.pipe(child.stderr, "warn", tail, log)
    void recordServer(this.deps.dataDir, child.pid).catch(() => undefined)
    const exited = new Promise<never>((_, reject) => {
      child.once("error", (error) => {
        host.close()
        log("warn", "spawn-failed", errorData(error))
        reject(error)
      })
      child.once("exit", (code, signal) => {
        host.close()
        this.running = null
        this.current = null
        log("warn", "exit", { code, signal, tail: tail.join("\n") })
        reject(new Error(`The editor server stopped (exit ${code ?? signal ?? "unknown"}).`))
      })
    })
    await Promise.race([this.waitUntilReady(port), exited]).catch((error: unknown) => {
      child.kill()
      host.close()
      throw error
    })
    log("info", "ready", { port })
    this.current = { port, token }
    return { port, token, bridgePort, bridgeToken, child, host }
  }

  // The way back from the bridge: a loopback endpoint on any free port that takes the bridge's
  // token, so only the extension host this server started can reach the app.
  private listenForBridge(token: string): Promise<HttpServer> {
    const server = createHttpServer((request, response) => {
      if (request.method !== "POST" || request.url !== "/comment" || request.headers["x-slagent-token"] !== token) {
        response.writeHead(404).end()
        return
      }
      let body = ""
      request.setEncoding("utf8")
      request.on("data", (chunk: string) => {
        body += chunk
        if (body.length > 64_000) request.destroy()
      })
      request.on("end", () => {
        let comment: DiffComment | null = null
        try {
          comment = parseEditorComment(JSON.parse(body || "{}"))
        } catch {
          // Not JSON; refused below.
        }
        if (!comment) {
          response.writeHead(400).end()
          return
        }
        this.deps.onComment?.(comment)
        response.writeHead(204).end()
      })
    })
    return new Promise((resolve, reject) => {
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => resolve(server))
    })
  }

  // Splits a stream into lines, keeps the last few for the exit report, and
  // forwards each to the log.
  private pipe(stream: NodeJS.ReadableStream | null, level: "info" | "warn", tail: string[], log: NonNullable<VscodeServerDeps["onEvent"]>): void {
    if (!stream) return
    let pending = ""
    stream.setEncoding("utf8")
    stream.on("data", (chunk: string) => {
      pending += chunk
      for (;;) {
        const end = pending.indexOf("\n")
        if (end < 0) break
        const line = pending.slice(0, end).trim()
        pending = pending.slice(end + 1)
        if (!line) continue
        tail.push(line)
        if (tail.length > TAIL_LINES) tail.shift()
        log(level, "output", { line })
      }
    })
  }

  private async waitUntilReady(port: number): Promise<void> {
    const request = this.deps.fetch ?? fetch
    const deadline = Date.now() + (this.deps.timeoutMs ?? 30_000)
    for (;;) {
      try {
        const response = await request(`http://127.0.0.1:${port}/version`)
        if (response.ok) return
      } catch {
        // Not listening yet.
      }
      if (Date.now() > deadline) throw new Error("The editor server did not start in time.")
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }
}
