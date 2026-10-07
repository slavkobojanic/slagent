import { describe, expect, it } from "vitest"
import { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"

describe("McpSettingsStore", () => {
  describe("setRefreshing", () => {
    it("can mark a refresh as running and finished", () => {
      const store = new McpSettingsStore()

      store.setRefreshing(true)
      expect(store.refreshing).toBe(true)
      store.setRefreshing(false)

      expect(store.refreshing).toBe(false)
    })
  })

  describe("setBusyName", () => {
    it("can mark one server as busy and then clear it", () => {
      const store = new McpSettingsStore()

      store.setBusyName("docs")
      expect(store.busyName).toBe("docs")
      store.setBusyName(null)

      expect(store.busyName).toBeNull()
    })
  })

  describe("setError", () => {
    it("can record and clear an error", () => {
      const store = new McpSettingsStore()

      store.setError("Server unreachable")
      expect(store.error).toBe("Server unreachable")
      store.setError(null)

      expect(store.error).toBeNull()
    })
  })
})
