import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http"
import { dirname, extname } from "node:path"
import { networkInterfaces } from "node:os"
import { WebSocket, WebSocketServer } from "ws"
import type { ServerInfo, TerminalEvent, UiEvent, WsClientMessage, WsServerMessage } from "../shared/types"

const DEFAULT_PORT = 8747
const PORT_ATTEMPTS = 20
// Tailscale can come up after the app does, so the server keeps looking for it.
const TAILSCALE_POLL_MS = 15_000

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".json": "application/json",
}

type State = {
  token: string
}

type Client = {
  socket: WebSocket
  // The window token only app connections send, so menu items and
  // notifications can find the client of the focused window.
  windowToken: string | null
}

export type Hub = {
  // A null clientId broadcasts the event to every client.
  publish: (clientId: string | null, event: UiEvent) => void
  publishTerminal: (event: TerminalEvent) => void
  publishUpdateReady: (version: string) => void
  publishCloseRequest: (clientId: string) => void
  clients: () => string[]
}

export type ApiServer = {
  hub: Hub
  // Read it fresh: the host changes when Tailscale comes up or goes away.
  readonly info: ServerInfo
  close: () => void
}

export type ApiServerOptions = {
  // userData/slagent-server.json: the port and token survive restarts.
  statePath: string
  onCall: (clientId: string, method: string, params: unknown[]) => Promise<unknown>
  onCallSent: (clientId: string, method: string, params: unknown[]) => void
  onClient: (clientId: string, windowToken: string | null) => void
  onClientGone: (clientId: string) => void
  // Maps an attachment's [projectId, chatId, file] to its path on disk, or null.
  attachmentFile: (parts: string[]) => string | null
  onInfo: (info: ServerInfo) => void
}

// The websocket server other clients talk to. It listens on localhost for the
// app's own windows and, when Tailscale is up, on the Tailscale IP too, so a
// phone on the tailnet can reach it. Every connection needs the token.
// Plain HTTP on the same port serves chat attachments to remote clients, which
// cannot load the app's slagent:// links: GET /<token>/attachment/<project>/<chat>/<file>.
export async function startApiServer(options: ApiServerOptions): Promise<ApiServer> {
  const state = await loadState(options.statePath)
  const wss = new WebSocketServer({ noServer: true })
  const clients = new Map<string, Client>()
  const servers: HttpServer[] = []

  const serve = (request: IncomingMessage, response: ServerResponse): void => {
    const parts = (request.url ?? "/").split("?")[0]!.split("/").filter(Boolean).map(safeDecode)
    const [token, kind, ...rest] = parts
    if (request.method !== "GET" || !token || !sameToken(token, state.token)) {
      response.writeHead(404).end()
      return
    }
    if (kind !== "attachment") {
      response.writeHead(404).end()
      return
    }
    const file = options.attachmentFile(rest)
    if (!file) {
      response.writeHead(404).end()
      return
    }
    void stat(file)
      .then((info) => {
        if (!info.isFile()) throw new Error("Not a file.")
        response.writeHead(200, {
          "Content-Type": CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
          "Content-Length": info.size,
          "Cache-Control": "private, max-age=31536000, immutable",
        })
        createReadStream(file).pipe(response)
      })
      .catch(() => response.writeHead(404).end())
  }

  const upgrade = (request: IncomingMessage, socket: import("node:stream").Duplex, head: Buffer): void => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    if (!sameToken(url.searchParams.get("token") ?? "", state.token)) {
      socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n")
      return
    }
    wss.handleUpgrade(request, socket, head, (socket) => {
      const clientId = url.searchParams.get("client") ?? randomUUID()
      const windowToken = url.searchParams.get("window")
      clients.set(clientId, { socket, windowToken })
      options.onClient(clientId, windowToken)
      socket.on("message", (data) => {
        let message: WsClientMessage
        try {
          message = JSON.parse(String(data)) as WsClientMessage
        } catch {
          return
        }
        const params = Array.isArray(message.params) ? message.params : []
        if (typeof message.method !== "string") return
        const id = "id" in message && typeof message.id === "number" ? message.id : null
        if (id === null) {
          options.onCallSent(clientId, message.method, params)
          return
        }
        void options
          .onCall(clientId, message.method, params)
          .then((result) => send(clientId, { id, ok: true, result }))
          .catch((error) => send(clientId, { id, ok: false, message: errorMessage(error) }))
      })
      socket.on("close", () => {
        clients.delete(clientId)
        options.onClientGone(clientId)
      })
      socket.on("error", () => undefined)
    })
  }

  const listen = (host: string, port: number): Promise<HttpServer> =>
    new Promise((resolve, reject) => {
      const server = createHttpServer(serve)
      server.on("upgrade", (request, socket, head) => upgrade(request, socket, head))
      server.once("error", reject)
      server.listen(port, host, () => {
        server.off("error", reject)
        servers.push(server)
        resolve(server)
      })
    })

  // Pick a free port on localhost first; the Tailscale listener reuses it.
  let port = 0
  let lastError: unknown = null
  for (let attempt = 0; attempt < PORT_ATTEMPTS; attempt += 1) {
    try {
      const server = await listen("127.0.0.1", DEFAULT_PORT + attempt)
      port = (server.address() as { port: number }).port
      break
    } catch (error) {
      lastError = error
    }
  }
  if (port === 0) throw lastError ?? new Error("No free port for the API server.")

  // The Tailscale listener, keyed by the address it is bound to.
  let tailscale: { ip: string; server: HttpServer } | null = null
  // An address that would not bind is not retried until it changes.
  let failedIp: string | null = null
  const info = (): ServerInfo => {
    const host = tailscale?.ip ?? "127.0.0.1"
    return {
      url: `ws://${host}:${port}?token=${state.token}`,
      host,
      port,
      token: state.token,
      tailscale: tailscale !== null,
    }
  }
  const watchTailscale = async (): Promise<void> => {
    const ip = findTailscaleAddress()
    const current = tailscale
    if (ip === (current?.ip ?? null) || (ip !== null && ip === failedIp)) return
    if (current) {
      current.server.close()
      servers.splice(servers.indexOf(current.server), 1)
      tailscale = null
    }
    if (ip) {
      try {
        tailscale = { ip, server: await listen(ip, port) }
        failedIp = null
      } catch (error) {
        failedIp = ip
        console.error("tailscale listener:", error)
      }
    }
    options.onInfo(info())
  }
  await watchTailscale()
  const poll = setInterval(() => void watchTailscale(), TAILSCALE_POLL_MS)

  const send = (clientId: string, message: WsServerMessage): void => {
    const client = clients.get(clientId)
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message))
    }
  }
  const broadcast = (message: WsServerMessage): void => {
    const text = JSON.stringify(message)
    for (const client of clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) client.socket.send(text)
    }
  }

  const hub: Hub = {
    publish: (clientId, event) => (clientId === null ? broadcast({ event }) : send(clientId, { event })),
    publishTerminal: (event) => broadcast({ terminal: event }),
    publishUpdateReady: (version) => broadcast({ updateReady: version }),
    publishCloseRequest: (clientId) => send(clientId, { closeRequest: true }),
    clients: () => [...clients.keys()],
  }

  return {
    hub,
    get info() {
      return info()
    },
    close: () => {
      clearInterval(poll)
      for (const server of servers) server.close()
      wss.close()
    },
  }
}

// The first non-internal IPv4 address in the CGNAT range Tailscale assigns.
function findTailscaleAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue
      const bytes = address.address.split(".").map(Number)
      if (bytes[0] === 100 && bytes[1]! >= 64 && bytes[1]! <= 127) return address.address
    }
  }
  return null
}

async function loadState(statePath: string): Promise<State> {
  const existing = await readFile(statePath, "utf8")
    .then((text) => JSON.parse(text) as Partial<State>)
    .catch(() => null)
  const state: State = {
    token: typeof existing?.token === "string" && existing.token ? existing.token : randomBytes(24).toString("base64url"),
  }
  await mkdir(dirname(statePath), { recursive: true })
  await writeFile(statePath, JSON.stringify({ token: state.token }))
  return state
}

function sameToken(given: string, token: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return ""
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
