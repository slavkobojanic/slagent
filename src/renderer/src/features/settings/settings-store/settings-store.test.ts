import { describe, expect, it } from "vitest"
import { SettingsStore } from "@/features/settings/settings-store/settings-store"

describe("SettingsStore", () => {
  describe("tab", () => {
    it("can start on the general section", () => {
      expect(new SettingsStore().tab).toBe("general")
    })
  })

  describe("setTab", () => {
    it("can select a section", () => {
      const store = new SettingsStore()

      store.setTab("mcp")

      expect(store.tab).toBe("mcp")
    })
  })
})
