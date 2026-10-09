import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSlagentApi, WsClient } from "./ws-client"

class FakeSocket {
  static all: FakeSocket[] = []
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((message: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly url: string) {
    FakeSocket.all.push(this)
  }

  send(text: string) {
    this.sent.push(text)
  }

  close() {
    this.onclose?.()
  }

  open() {
    this.onopen?.()
  }

  reply(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

beforeEach(() => {
  FakeSocket.all = []
  vi.useFakeTimers()
  vi.stubGlobal("WebSocket", FakeSocket)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function latest(): FakeSocket {
  const socket = FakeSocket.all.at(-1)
  if (!socket) throw new Error("no socket")
  return socket
}

describe("WsClient", () => {
  it("can hold calls made before the socket opens and send them on open", async () => {
    const client = new WsClient("ws://host:1?token=t")
    client.connect()
    const result = client.call<string>("appVersion")
    expect(latest().sent).toEqual([])
    latest().open()
    const sent = JSON.parse(latest().sent[0]!) as { id: number; method: string }
    expect(sent.method).toBe("appVersion")
    latest().reply({ id: sent.id, ok: true, result: "1.0.0" })
    await expect(result).resolves.toBe("1.0.0")
  })

  it("can reject a call when the server answers with an error", async () => {
    const client = new WsClient("ws://host:1")
    client.connect()
    latest().open()
    const result = client.call("prompt")
    const sent = JSON.parse(latest().sent[0]!) as { id: number }
    latest().reply({ id: sent.id, ok: false, message: "No model" })
    await expect(result).rejects.toThrow("No model")
  })

  it("can reconnect after a drop and tell its listeners", () => {
    const client = new WsClient("ws://host:1", undefined, 1000)
    const reconnects = vi.fn()
    const statuses: string[] = []
    client.reconnectListeners.add(reconnects)
    client.statusListeners.add((status) => statuses.push(status))
    client.connect()
    latest().open()
    latest().close()
    expect(client.status).toBe("connecting")
    vi.advanceTimersByTime(1000)
    latest().open()
    expect(FakeSocket.all).toHaveLength(2)
    expect(reconnects).toHaveBeenCalledTimes(1)
    expect(statuses).toEqual(["open", "connecting", "open"])
  })

  it("can skip the reconnect listeners on the first open", () => {
    const client = new WsClient("ws://host:1")
    const reconnects = vi.fn()
    client.reconnectListeners.add(reconnects)
    client.connect()
    latest().open()
    expect(reconnects).not.toHaveBeenCalled()
  })

  it("can reject pending calls when the socket closes", async () => {
    const client = new WsClient("ws://host:1")
    client.connect()
    latest().open()
    const result = client.call("getSnapshot")
    latest().close()
    await expect(result).rejects.toThrow("The connection was closed.")
  })

  it("can reconnect at once when woken", () => {
    const client = new WsClient("ws://host:1", undefined, 60_000)
    client.connect()
    latest().open()
    latest().close()
    client.wake()
    expect(FakeSocket.all).toHaveLength(2)
  })

  it("can stay closed after close", () => {
    const client = new WsClient("ws://host:1", undefined, 1000)
    client.connect()
    latest().open()
    client.close()
    vi.advanceTimersByTime(5000)
    client.wake()
    expect(FakeSocket.all).toHaveLength(1)
  })

  it("can rewrite pushes before they reach the listeners", () => {
    const client = new WsClient("ws://host:1", (text) => text.replace("slagent://", "http://"))
    const events: unknown[] = []
    client.eventListeners.add((event) => events.push(event))
    client.connect()
    latest().open()
    latest().reply({ event: { type: "git", revision: 1, url: "slagent://x" } })
    expect(events).toEqual([{ type: "git", revision: 1, url: "http://x" }])
  })
})

describe("createSlagentApi", () => {
  it("can open links locally when the client says so", async () => {
    const client = new WsClient("ws://host:1")
    const openExternal = vi.fn(async () => undefined)
    const api = createSlagentApi(client, { platform: "ios", systemVersion: "", pathForFile: () => "", openExternal })
    await api.openExternal("https://example.com")
    expect(openExternal).toHaveBeenCalledWith("https://example.com")
  })

  it("can send fire-and-forget calls without an id", () => {
    const client = new WsClient("ws://host:1")
    const api = createSlagentApi(client, { platform: "darwin", systemVersion: "", pathForFile: () => "" })
    client.connect()
    latest().open()
    api.writeTerminal("t1", "ls")
    expect(JSON.parse(latest().sent[0]!)).toEqual({ method: "writeTerminal", params: ["t1", "ls"] })
  })
})
