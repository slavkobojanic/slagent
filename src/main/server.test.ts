// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { WebSocket } from "ws"
import { startApiServer, type ApiServer } from "./server"

const tempDirs: string[] = []
const servers: ApiServer[] = []

async function start(onCall: (method: string) => Promise<unknown> = async () => undefined): Promise<ApiServer> {
  const dir = await mkdtemp(join(tmpdir(), "slagent-server-"))
  tempDirs.push(dir)
  const server = await startApiServer({
    statePath: join(dir, "slagent-server.json"),
    onCall: async (_clientId, method) => onCall(method),
    onCallSent: () => undefined,
    onClient: () => undefined,
    onClientGone: () => undefined,
  })
  servers.push(server)
  return server
}

function connect(info: ApiServer["info"], token = info.token): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${info.url.split("?")[0]}?token=${token}`)
    socket.on("open", () => resolve(socket))
    socket.on("error", reject)
  })
}

function call(socket: WebSocket, id: number, method: string): Promise<{ ok: boolean; message?: string; result?: unknown }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), 2000)
    socket.on("message", (data) => {
      const reply = JSON.parse(String(data)) as { id: number; ok: boolean; message?: string; result?: unknown }
      if (reply.id !== id) return
      clearTimeout(timer)
      resolve(reply)
    })
    socket.send(JSON.stringify({ id, method }))
  })
}

afterEach(async () => {
  for (const server of servers.splice(0)) server.close()
  for (const dir of tempDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

describe("api server", () => {
  it("rejects connections without the token", async () => {
    const server = await start()
    const socket = await connect(server.info, "wrong-token").catch(() => null)
    expect(socket).toBeNull()
  })

  it("answers calls from a tokened client and routes pushes", async () => {
    const seen: string[] = []
    const server = await start(async (method) => {
      seen.push(method)
      return { method }
    })
    const socket = await connect(server.info)
    const reply = await call(socket, 1, "getSnapshot")
    expect(reply.ok).toBe(true)
    expect(reply.result).toEqual({ method: "getSnapshot" })
    expect(seen).toEqual(["getSnapshot"])

    let pushed: unknown = null
    socket.on("message", (data) => {
      const message = JSON.parse(String(data)) as { event?: unknown }
      if (message.event) pushed = message.event
    })
    server.hub.publish(null, { type: "library", revision: 1, library: { projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null } })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(pushed).toEqual({ type: "library", revision: 1, library: { projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null } })
  })

  it("keeps the token across restarts and reports it in the connection info", async () => {
    const dir = await mkdtemp(join(tmpdir(), "slagent-server-"))
    tempDirs.push(dir)
    const statePath = join(dir, "slagent-server.json")
    const first = await startApiServer({
      statePath,
      onCall: async () => undefined,
      onCallSent: () => undefined,
      onClient: () => undefined,
      onClientGone: () => undefined,
    })
    servers.push(first)
    const second = await startApiServer({
      statePath,
      onCall: async () => undefined,
      onCallSent: () => undefined,
      onClient: () => undefined,
      onClientGone: () => undefined,
    })
    servers.push(second)
    expect(second.info.token).toBe(first.info.token)
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({ token: first.info.token })
  })
})
