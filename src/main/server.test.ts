// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { WebSocket } from "ws"
import { startApiServer, type ApiServer } from "./server"

const tempDirs: string[] = []
const servers: ApiServer[] = []

async function start(
  onCall: (method: string) => Promise<unknown> = async () => undefined,
  attachmentFile: (parts: string[]) => string | null = () => null,
): Promise<ApiServer> {
  const dir = await mkdtemp(join(tmpdir(), "slagent-server-"))
  tempDirs.push(dir)
  const server = await startApiServer({
    statePath: join(dir, "slagent-server.json"),
    onCall: async (_clientId, method) => onCall(method),
    onCallSent: () => undefined,
    onClient: () => undefined,
    onClientGone: () => undefined,
    attachmentFile,
    onInfo: () => undefined,
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
    server.hub.publish(null, { type: "library", revision: 1, library: { projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null, tasks: [] } })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(pushed).toEqual({ type: "library", revision: 1, library: { projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null, tasks: [] } })
  })

  it("serves attachments over http to a tokened request", async () => {
    const dir = await mkdtemp(join(tmpdir(), "slagent-attachment-"))
    tempDirs.push(dir)
    const file = join(dir, "shot.png")
    await writeFile(file, "png-bytes")
    const asked: string[][] = []
    const server = await start(undefined, (parts) => {
      asked.push(parts)
      return parts[2] === "shot.png" ? file : null
    })
    const base = `http://127.0.0.1:${server.info.port}`
    const ok = await fetch(`${base}/${server.info.token}/attachment/p1/c1/shot.png`)
    expect(ok.status).toBe(200)
    expect(ok.headers.get("content-type")).toBe("image/png")
    expect(await ok.text()).toBe("png-bytes")
    expect(asked).toEqual([["p1", "c1", "shot.png"]])

    const wrongToken = await fetch(`${base}/wrong/attachment/p1/c1/shot.png`)
    expect(wrongToken.status).toBe(404)
    const missing = await fetch(`${base}/${server.info.token}/attachment/p1/c1/other.png`)
    expect(missing.status).toBe(404)
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
      attachmentFile: () => null,
      onInfo: () => undefined,
    })
    servers.push(first)
    const second = await startApiServer({
      statePath,
      onCall: async () => undefined,
      onCallSent: () => undefined,
      onClient: () => undefined,
      onClientGone: () => undefined,
      attachmentFile: () => null,
      onInfo: () => undefined,
    })
    servers.push(second)
    expect(second.info.token).toBe(first.info.token)
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({ token: first.info.token })
  })
})
