import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { McpManager } from "./mcp"

const dirs: string[] = []

async function managerWith(servers: Record<string, unknown>): Promise<{ manager: McpManager; configPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), "slagent-mcp-"))
  dirs.push(dir)
  const configPath = join(dir, "mcp.json")
  await writeFile(configPath, JSON.stringify({ mcpServers: servers }))
  const manager = new McpManager({ configPath, openUrl: () => undefined })
  await manager.start()
  return { manager, configPath }
}

const existing = {
  docs: { url: "https://example.com/mcp", description: "Existing docs server." },
  files: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
}

afterEach(async () => {
  // mkdtemp dirs hold only the config files written here.
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("McpManager.addServer", () => {
  it("saves a remote server and keeps the servers already configured", async () => {
    const { manager, configPath } = await managerWith(existing)
    await manager.addServer("sentry", { url: "https://mcp.sentry.dev/mcp" })
    const saved = JSON.parse(await readFile(configPath, "utf8")) as { mcpServers: Record<string, unknown> }
    expect(Object.keys(saved.mcpServers)).toEqual(["docs", "files", "sentry"])
    expect(saved.mcpServers.sentry).toEqual({ url: "https://mcp.sentry.dev/mcp" })
  })

  it("saves a stdio server", async () => {
    const { manager, configPath } = await managerWith(existing)
    await manager.addServer("fs", { command: "npx", args: ["-y", "server-filesystem"] })
    const saved = JSON.parse(await readFile(configPath, "utf8")) as { mcpServers: Record<string, { command?: string }> }
    expect(saved.mcpServers.fs).toEqual({ command: "npx", args: ["-y", "server-filesystem"] })
  })

  it("refuses a name Pi would not accept", async () => {
    const { manager } = await managerWith(existing)
    await expect(manager.addServer("bad name", { url: "https://example.com/mcp" })).rejects.toThrow(/valid server name/)
    await expect(manager.addServer("", { url: "https://example.com/mcp" })).rejects.toThrow(/valid server name/)
  })

  it("refuses to replace an existing server", async () => {
    const { manager, configPath } = await managerWith(existing)
    await expect(manager.addServer("docs", { url: "https://other.com/mcp" })).rejects.toThrow(/already exists/)
    const saved = JSON.parse(await readFile(configPath, "utf8")) as { mcpServers: Record<string, { url?: string }> }
    expect(saved.mcpServers.docs).toEqual({ url: "https://example.com/mcp", description: "Existing docs server." })
  })

  it("refuses a stdio server without a command", async () => {
    const { manager, configPath } = await managerWith(existing)
    await expect(manager.addServer("fs", { command: "  " })).rejects.toThrow(/needs a command/)
    const saved = JSON.parse(await readFile(configPath, "utf8")) as { mcpServers: Record<string, unknown> }
    expect(Object.keys(saved.mcpServers)).toEqual(["docs", "files"])
  })
})
