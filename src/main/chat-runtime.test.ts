import { describe, expect, it } from "vitest"
import { CHAT_TOOLS } from "./chat-prompt"
import { CODING_TOOLS } from "./chat-runtime"

describe("tool allowlists", () => {
  // Pi hides any tool missing from the allowlist, so each mode must name it.
  it.each([
    ["coding", CODING_TOOLS],
    ["chat", CHAT_TOOLS],
  ])("%s projects can use add_mcp_server", (_mode, tools) => {
    expect(tools).toContain("add_mcp_server")
  })
})
