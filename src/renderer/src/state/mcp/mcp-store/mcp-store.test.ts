import { describe, expect, it } from "vitest"
import type { McpServerStatus } from "@shared/types"
import { McpStore } from "@/state/mcp/mcp-store/mcp-store"

const server: McpServerStatus = {
  name: "docs",
  state: "needs-auth",
  enabled: true,
  oauth: true,
  tools: 0,
  description: null,
  detail: null,
}

describe("McpStore", () => {
  describe("setServers", () => {
    it("can replace the server list", () => {
      const store = new McpStore()

      store.setServers([server])

      expect(store.servers).toEqual([server])
    })
  })
})
