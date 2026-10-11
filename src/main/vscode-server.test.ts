import { EventEmitter } from "node:events"
import type { ChildProcess } from "node:child_process"
import { describe, expect, it, vi } from "vitest"
import { DEFAULT_EDITOR_PREFS } from "../shared/editor"
import { distDir, editorSettings, serverArgs, VscodeServer, workbenchUrl } from "./vscode-server"

class FakeChild extends EventEmitter {
  killed = false
  kill() {
    this.killed = true
    return true
  }
}

function setup(overrides: { ready?: boolean[]; post?: number } = {}) {
  const child = new FakeChild()
  const spawn = vi.fn(() => child as unknown as ChildProcess)
  let tokens = 0
  const ports = [4000, 4001, 4002, 4003]
  const ready = [...(overrides.ready ?? [true])]
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const target = String(url)
    if (target.endsWith("/version")) return new Response("x", { status: ready.shift() === false ? 503 : 200 })
    return new Response(null, { status: overrides.post ?? 204 })
  }) as unknown as typeof fetch
  const server = new VscodeServer({
    dist: "/dist",
    dataDir: "/data",
    spawn,
    freePort: async () => ports.shift() ?? 9999,
    fetch: fetchFn,
    token: () => `token${++tokens}`,
    timeoutMs: 1000,
  })
  return { server, child, spawn, fetchFn }
}

describe("distDir", () => {
  const base = { resourcesPath: "/res", appPath: "/app", platform: "darwin", arch: "arm64" }

  it("can use the app's resources when packaged", () => {
    expect(distDir({ ...base, packaged: true })).toBe("/res/vscode-server")
  })

  it("can use the vendor build output in development", () => {
    expect(distDir({ ...base, packaged: false })).toBe("/app/vendor/vscode-server/dist/darwin-arm64")
  })
})

describe("serverArgs", () => {
  it("can bind to loopback with a token and keep its data in the given folder", () => {
    const args = serverArgs({ port: 4000, token: "abc", dataDir: "/data" })

    expect(args).toEqual(expect.arrayContaining(["--host", "127.0.0.1", "--port", "4000", "--connection-token", "abc", "--server-data-dir", "/data"]))
    expect(args).toContain("--accept-server-license-terms")
  })

  it("can keep extensions inside the data folder", () => {
    const args = serverArgs({ port: 1, token: "t", dataDir: "/data" })

    expect(args[args.indexOf("--extensions-dir") + 1]).toBe("/data/extensions")
  })
})

describe("workbenchUrl", () => {
  it("can carry the token and the folder", () => {
    expect(workbenchUrl({ port: 4000, token: "abc", folder: "/p/my app" })).toBe("http://127.0.0.1:4000/?tkn=abc&folder=%2Fp%2Fmy+app")
  })

  it("can leave the folder out when none is open", () => {
    expect(workbenchUrl({ port: 4000, token: "abc", folder: "" })).toBe("http://127.0.0.1:4000/?tkn=abc")
  })
})

describe("editorSettings", () => {
  it("can name the workbench's own settings", () => {
    expect(editorSettings({ ...DEFAULT_EDITOR_PREFS, fontSize: 15, tabSize: 4, wordWrap: true, minimap: true })).toEqual({
      "editor.fontSize": 15,
      "editor.tabSize": 4,
      "editor.wordWrap": "on",
      "editor.minimap.enabled": true,
    })
  })

  it("can turn word wrap off", () => {
    expect(editorSettings(DEFAULT_EDITOR_PREFS)["editor.wordWrap"]).toBe("off")
  })
})

describe("VscodeServer", () => {
  it("can start the server once and give the workbench url", async () => {
    const { server, spawn } = setup()

    const first = await server.url("/p")
    const second = await server.url("/p")

    expect(first).toBe("http://127.0.0.1:4000/?tkn=token1&folder=%2Fp")
    expect(second).toBe(first)
    expect(spawn).toHaveBeenCalledTimes(1)
  })

  it("can launch the bundled node with the bridge's port and token in its environment", async () => {
    const { server, spawn } = setup()

    await server.url("/p")

    const [command, , options] = spawn.mock.calls[0] as unknown as [string, string[], { cwd: string; env: NodeJS.ProcessEnv }]
    expect(command).toBe("/dist/node")
    expect(options.cwd).toBe("/dist")
    expect(options.env.SLAGENT_BRIDGE_PORT).toBe("4001")
    expect(options.env.SLAGENT_BRIDGE_TOKEN).toBe("token2")
  })

  it("can wait until the server answers", async () => {
    const { server } = setup({ ready: [false, false, true] })

    await expect(server.url("/p")).resolves.toContain("tkn=token1")
  })

  it("can fail when the server never answers, and stop the process", async () => {
    const { server, child } = setup({ ready: Array(100).fill(false) })

    await expect(server.url("/p")).rejects.toThrow("did not start in time")
    expect(child.killed).toBe(true)
  })

  it("can fail when the process exits while starting", async () => {
    const { server, child } = setup({ ready: Array(100).fill(false) })
    const pending = server.url("/p")
    await vi.waitFor(() => expect(child.listenerCount("exit")).toBeGreaterThan(0))

    child.emit("exit", 1)

    await expect(pending).rejects.toThrow("stopped (exit 1)")
  })

  it("can start again after a failed start", async () => {
    const { server, spawn } = setup({ ready: [false, ...Array(100).fill(true)] })
    const bad = new VscodeServer({ dist: "/dist", dataDir: "/d", spawn, freePort: async () => 1, fetch: (async () => new Response("", { status: 503 })) as unknown as typeof fetch, timeoutMs: 1 })
    await expect(bad.url("/p")).rejects.toThrow()

    await expect(server.url("/p")).resolves.toContain("http://127.0.0.1")
  })

  it("can post to the bridge with its own token", async () => {
    const { server, fetchFn } = setup()

    await server.post("/open", { path: "/p/a.ts", line: 3 })

    const call = vi.mocked(fetchFn).mock.calls.find(([url]) => String(url).endsWith("/open"))
    expect(String(call?.[0])).toBe("http://127.0.0.1:4001/open")
    expect(call?.[1]).toMatchObject({ method: "POST", headers: { "x-slagent-token": "token2" }, body: JSON.stringify({ path: "/p/a.ts", line: 3 }) })
  })

  it("can retry while the bridge is not listening yet", async () => {
    const child = new FakeChild()
    let attempts = 0
    const fetchFn = (async (url: string | URL | Request) => {
      if (String(url).endsWith("/version")) return new Response("x")
      attempts += 1
      if (attempts < 3) throw new Error("ECONNREFUSED")
      return new Response(null, { status: 204 })
    }) as unknown as typeof fetch
    const server = new VscodeServer({ dist: "/d", dataDir: "/x", spawn: () => child as unknown as ChildProcess, freePort: async () => 1, fetch: fetchFn })

    await server.post("/open", { path: "/a" })

    expect(attempts).toBe(3)
  })

  it("can give up when the bridge never listens", async () => {
    const child = new FakeChild()
    const fetchFn = (async (url: string | URL | Request) => {
      if (String(url).endsWith("/version")) return new Response("x")
      throw new Error("ECONNREFUSED")
    }) as unknown as typeof fetch
    const server = new VscodeServer({ dist: "/d", dataDir: "/x", spawn: () => child as unknown as ChildProcess, freePort: async () => 1, fetch: fetchFn, bridgeTimeoutMs: 1 })

    await expect(server.post("/open", {})).rejects.toThrow("ECONNREFUSED")
  })

  it("can report whether the server has been started", async () => {
    const { server } = setup()
    expect(server.started).toBe(false)

    await server.url("/p")

    expect(server.started).toBe(true)
  })

  it("can fail when the bridge refuses a request", async () => {
    const { server } = setup({ post: 400 })

    await expect(server.post("/command", { id: "x" })).rejects.toThrow("refused the request (400)")
  })

  it("can stop the process", async () => {
    const { server, child } = setup()
    await server.url("/p")

    server.stop()
    await Promise.resolve()

    expect(child.killed).toBe(true)
  })

  it("can ignore a stop before anything started", () => {
    expect(() => setup().server.stop()).not.toThrow()
  })
})
