import { describe, expect, it } from "vitest"
import { CHAT_TOOLS } from "./chat-prompt"
import { calculateTokensPerSecond, CODING_TOOLS } from "./chat-runtime"

describe("generation speed", () => {
  it("computes output tokens per second", () => {
    expect(calculateTokensPerSecond(120, 4_000)).toBe(30)
  })

  it("omits a speed when token count or duration is unavailable", () => {
    expect(calculateTokensPerSecond(0, 1_000)).toBeNull()
    expect(calculateTokensPerSecond(20, 0)).toBeNull()
  })
})

describe("tool allowlists", () => {
  // Pi hides any tool missing from the allowlist, so each mode must name it.
  it.each([
    ["coding", CODING_TOOLS],
    ["chat", CHAT_TOOLS],
  ])("%s projects can use add_mcp_server", (_mode, tools) => {
    expect(tools).toContain("add_mcp_server")
  })

  it.each([
    ["coding", CODING_TOOLS],
    ["chat", CHAT_TOOLS],
  ])("%s projects allow MCP server tools, including web search", (_mode, tools) => {
    expect(tools).toContain("mcp__*")
  })

  it("chat projects can submit a plan", () => {
    expect(CHAT_TOOLS).toContain("propose_plan")
  })
})
