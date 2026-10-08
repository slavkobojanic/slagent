import { randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer as createHttpServer, type IncomingMessage, type Server as HttpServer } from "node:http"
import { dirname } from "node:path"
import { networkInterfaces } from "node:os"
import { WebSocket, WebSocketServer } from "ws"
import type { ServerInfo, TerminalEvent, UiEvent, WsClientMessage, WsServerMessage } from "../shared/types"

const DEFAULT_PORT = 8747
const PORT_ATTEMPTS = 20

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
  info: ServerInfo
  close: () => void
}

export type ApiServerOptions = {
  // userData/slagent-server.json: the port and token survive restarts.
  statePath: string
  onCall: (clientId: string, method: string, params: unknown[]) => Promise<unknown>
  onCallSent: (clientId: string, method: string, params: unknown[]) => void
  onClient: (clientId: string, windowToken: string | null) => void
  onClientGone: (clientId: string) => void
}

// The websocket server other clients talk to. It listens on localhost for the
// app's own windows and, when Tailscale is up, on the Tailscale IP too, so a
// phone on the tailnet can reach it. Every connection needs the token.
export async function startApiServer(options: ApiServerOptions): Promise<ApiServer> {
  const state = await loadState(options.statePath)
  const wss = new WebSocketServer({ noServer: true })
  const clients = new Map<string, Client>()
  const servers: HttpServer[] = []

  const upgrade = (request: IncomingMessage, socket: import("node:stream").Duplex, head: Buffer): void => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    if (url.searchParams.get("token") !== state.token) {
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

  const listen = (host: string, port: number): Promise<number> =>
    new Promise((resolve, reject) => {
      const server = createHttpServer()
      server.on("upgrade", (request, socket, head) => upgrade(request, socket, head))
      servers.push(server)
      server.once("error", reject)
      server.listen(port, host, () => {
        server.off("error", reject)
        resolve((server.address() as { port: number }).port)
      })
    })

  // Pick a free port on localhost first; the Tailscale listener reuses it.
  let port = 0
  let lastError: unknown = null
  for (let attempt = 0; attempt < PORT_ATTEMPTS; attempt += 1) {
    try {
      port = await listen("127.0.0.1", DEFAULT_PORT + attempt)
      break
    } catch (error) {
      lastError = error
    }
  }
  if (port === 0) throw lastError ?? new Error("No free port for the API server.")

  const tailscaleIp = findTailscaleAddress()
  let host = "127.0.0.1"
  if (tailscaleIp) {
    await listen(tailscaleIp, port).catch((error) => console.error("tailscale listener:", error))
    host = tailscaleIp
  }

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

  const info: ServerInfo = {
    url: `ws://${host}:${port}?token=${state.token}`,
    host,
    port,
    token: state.token,
    tailscale: Boolean(tailscaleIp),
  }

  return {
    hub,
    info,
    close: () => {
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
