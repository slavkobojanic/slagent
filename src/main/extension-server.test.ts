import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { startExtensionServer, type ExtensionServer } from "./extension-server"

describe("startExtensionServer", () => {
  let root: string
  let server: ExtensionServer

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "slagent-extsrv-"))
    await mkdir(join(root, "a.b", "1.0.0", "out"), { recursive: true })
    await writeFile(join(root, "a.b", "1.0.0", "out", "web.js"), "export {}")
    await writeFile(join(root, "a.b", "1.0.0", "data.json"), "{}")
    server = await startExtensionServer(root)
  })

  afterEach(async () => {
    server.close()
    await rm(root, { recursive: true, force: true })
  })

  it("can serve an installed file with its content type", async () => {
    const response = await fetch(`${server.baseUrl}/a.b/1.0.0/out/web.js`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("export {}")
    expect(response.headers.get("content-type")).toBe("text/javascript")
  })

  it("can allow the editor's origin to read the file", async () => {
    const response = await fetch(`${server.baseUrl}/a.b/1.0.0/data.json`)

    expect(response.headers.get("access-control-allow-origin")).toBe("*")
    expect(response.headers.get("content-type")).toBe("application/json")
  })

  it("can answer 404 for a missing file", async () => {
    expect((await fetch(`${server.baseUrl}/a.b/1.0.0/nope.js`)).status).toBe(404)
  })

  it("can refuse a path that climbs out of the folder", async () => {
    const response = await fetch(`${server.baseUrl}/%2e%2e/%2e%2e/etc/hosts`)

    expect(response.status).toBe(404)
  })

  it("can answer 404 for a directory", async () => {
    expect((await fetch(`${server.baseUrl}/a.b/1.0.0/out`)).status).toBe(404)
  })

  it("can refuse anything but GET", async () => {
    const response = await fetch(`${server.baseUrl}/a.b/1.0.0/data.json`, { method: "POST" })

    expect(response.status).toBe(404)
  })

  it("can listen on loopback", () => {
    expect(server.baseUrl).toMatch(/^http:\/\/localhost:\d+$/)
  })
})
