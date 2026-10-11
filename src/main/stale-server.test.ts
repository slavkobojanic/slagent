import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { forgetServer, recordServer, stopStaleServer, type ProcessTools } from "./stale-server"

describe("stale server", () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "slagent-stale-"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const tools = (command: string | null): ProcessTools & { kill: ReturnType<typeof vi.fn> } => {
    let alive = command !== null
    return {
      command: vi.fn(async () => (alive ? command : null)),
      kill: vi.fn(() => {
        alive = false
      }),
    }
  }

  it("can record the pid beside the server's data", async () => {
    await recordServer(dir, 1234)

    expect(await readFile(join(dir, "server.pid"), "utf8")).toBe("1234")
  })

  it("can skip recording when the process has no pid", async () => {
    await recordServer(dir, undefined)

    await expect(stat(join(dir, "server.pid"))).rejects.toThrow()
  })

  it("can forget the pid", async () => {
    await recordServer(dir, 1234)

    await forgetServer(dir)

    await expect(stat(join(dir, "server.pid"))).rejects.toThrow()
  })

  it("can do nothing when no server was recorded", async () => {
    const stop = tools("node out/server-main.js")

    expect(await stopStaleServer(dir, stop)).toBe(false)
    expect(stop.kill).not.toHaveBeenCalled()
  })

  it("can stop a leftover server and clear its record", async () => {
    await recordServer(dir, 4321)
    const stop = tools("/dist/node out/server-main.js --port 47821")

    expect(await stopStaleServer(dir, stop)).toBe(true)
    expect(stop.kill).toHaveBeenCalledWith(4321)
    await expect(stat(join(dir, "server.pid"))).rejects.toThrow()
  })

  it("can leave a process alone when its pid was reused by something else", async () => {
    await recordServer(dir, 4321)
    const stop = tools("/usr/bin/some-other-program")

    expect(await stopStaleServer(dir, stop)).toBe(false)
    expect(stop.kill).not.toHaveBeenCalled()
  })

  it("can do nothing when the recorded process has already exited", async () => {
    await recordServer(dir, 4321)
    const stop = tools(null)

    expect(await stopStaleServer(dir, stop)).toBe(false)
    expect(stop.kill).not.toHaveBeenCalled()
  })

  it("can refuse a recorded value that is not a real pid", async () => {
    await recordServer(dir, 1)
    const stop = tools("node out/server-main.js")

    expect(await stopStaleServer(dir, stop)).toBe(false)
    expect(stop.kill).not.toHaveBeenCalled()
  })

  it("can stop a real leftover process", async () => {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", "out/server-main.js"], { stdio: "ignore" })
    await recordServer(dir, child.pid)
    const exited = new Promise((resolve) => child.once("exit", resolve))

    expect(await stopStaleServer(dir)).toBe(true)
    await exited
    expect(child.killed || child.exitCode !== null || child.signalCode !== null).toBe(true)
  })
})
