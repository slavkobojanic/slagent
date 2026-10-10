import { describe, expect, it, vi } from "vitest"
import type { McpServerConfig } from "@earendil-works/pi-coding-agent"
import { mcpAddExtension } from "./mcp-add"

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean; details?: unknown }
type Tool = { name: string; execute: (id: string, input: unknown) => Promise<ToolResult> }

function build(addServer: (name: string, config: McpServerConfig) => Promise<void>, registered: string[] = [], connectTimeoutMs = 0) {
  const addServerSpy = vi.fn(addServer)
  const registerMcpServer = vi.fn()
  const setActiveTools = vi.fn()
  let tool: Tool | undefined
  mcpAddExtension({ addServer: addServerSpy, connectTimeoutMs })({
    registerTool: (def: Tool) => {
      tool = def
    },
    registerMcpServer,
    getAllTools: () => registered.map((name) => ({ name })),
    getActiveTools: () => ["read"],
    setActiveTools,
  } as never)
  return { tool: tool as Tool, addServerSpy, registerMcpServer, setActiveTools }
}

describe("add_mcp_server", () => {
  it("persists and registers a remote server", async () => {
    const { tool, addServerSpy, registerMcpServer } = build(async () => undefined)
    const result = await tool.execute("t1", { name: "sentry", url: "https://mcp.sentry.dev/mcp" })
    expect(result.isError).toBeUndefined()
    expect(addServerSpy).toHaveBeenCalledOnce()
    expect(addServerSpy.mock.calls[0][1]).toEqual({ url: "https://mcp.sentry.dev/mcp", headers: undefined, description: undefined, exposure: "direct" })
    expect(registerMcpServer).toHaveBeenCalledWith("sentry", { url: "https://mcp.sentry.dev/mcp", headers: undefined, description: undefined, exposure: "direct" })
    expect(result.content[0].text).toContain("Added \"sentry\"")
  })

  it("activates the server's tools once they connect", async () => {
    const { tool, setActiveTools } = build(async () => undefined, ["mcp__my_docs__search", "mcp__other__x"])
    const result = await tool.execute("t10", { name: "my-docs", url: "https://example.com/mcp" })
    expect(setActiveTools).toHaveBeenCalledWith(["read", "mcp__my_docs__search"])
    expect(result.content[0].text).toContain("mcp__my_docs__search")
  })

  it("reports when no tools connected before the timeout", async () => {
    const { tool, setActiveTools } = build(async () => undefined)
    const result = await tool.execute("t11", { name: "linear", url: "https://mcp.linear.app/mcp" })
    expect(result.isError).toBeUndefined()
    expect(setActiveTools).not.toHaveBeenCalled()
    expect(result.content[0].text).toContain("no tools connected yet")
  })

  it("persists a stdio server with args and env", async () => {
    const { tool, addServerSpy } = build(async () => undefined)
    const result = await tool.execute("t2", { name: "fs", command: "npx", args: ["-y", "server-fs"], env: { KEY: "${KEY}" } })
    expect(result.isError).toBeUndefined()
    expect(addServerSpy.mock.calls[0][1]).toEqual({ command: "npx", args: ["-y", "server-fs"], env: { KEY: "${KEY}" }, description: undefined, exposure: "direct" })
  })

  it("reports the persistence error back to the model", async () => {
    const { tool, registerMcpServer } = build(async () => {
      throw new Error("An MCP server named \"docs\" already exists. Remove it in Settings > MCP first.")
    })
    const result = await tool.execute("t3", { name: "docs", url: "https://example.com/mcp" })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("already exists")
    expect(registerMcpServer).not.toHaveBeenCalled()
  })

  it("requires a name before anything is saved", async () => {
    const { tool, addServerSpy } = build(async () => undefined)
    expect((await tool.execute("t4", { url: "https://example.com/mcp" })).content[0].text).toContain("Give the server a short name")
    expect(addServerSpy).not.toHaveBeenCalled()
  })

  it("surfaces the manager's rejection of an invalid name", async () => {
    const { tool } = build(async (name) => {
      if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error(`"${name}" is not a valid server name; use letters, digits, "_" and "-".`)
    })
    const result = await tool.execute("t5", { name: "bad name", url: "https://example.com/mcp" })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("valid server name")
  })

  it("requires exactly one of url and command", async () => {
    const { tool, addServerSpy } = build(async () => undefined)
    expect((await tool.execute("t6", { name: "x" })).content[0].text).toContain("Pass url for a remote server")
    expect((await tool.execute("t7", { name: "x", url: "https://example.com/mcp", command: "npx" })).content[0].text).toContain("either url or command")
    expect(addServerSpy).not.toHaveBeenCalled()
  })

  it("rejects a url that is not a valid http(s) endpoint", async () => {
    const { tool, addServerSpy } = build(async () => undefined)
    expect((await tool.execute("t8", { name: "x", url: "not a url" })).content[0].text).toContain("not a valid URL")
    expect((await tool.execute("t9", { name: "x", url: "ftp://example.com/mcp" })).content[0].text).toContain("http or https")
    expect(addServerSpy).not.toHaveBeenCalled()
  })
})
