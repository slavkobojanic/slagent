import { describe, expect, it } from "vitest"
import { ExtensionSettingsStore } from "./extension-settings-store"

describe("ExtensionSettingsStore", () => {
  describe("canSearch", () => {
    it("can be false for a blank query", () => {
      const store = new ExtensionSettingsStore()
      store.setQuery("   ")

      expect(store.canSearch).toBe(false)
    })

    it("can be false while a search runs", () => {
      const store = new ExtensionSettingsStore()
      store.setQuery("java")
      store.setSearching(true)

      expect(store.canSearch).toBe(false)
    })

    it("can be true for a query when idle", () => {
      const store = new ExtensionSettingsStore()
      store.setQuery("java")

      expect(store.canSearch).toBe(true)
    })
  })

  describe("setResults", () => {
    it("can remember that a search has run", () => {
      const store = new ExtensionSettingsStore()

      store.setResults([])

      expect(store.searched).toBe(true)
    })
  })

  describe("busy", () => {
    it("can track an id once", () => {
      const store = new ExtensionSettingsStore()

      store.startBusy("a.b")
      store.startBusy("a.b")

      expect(store.busy).toEqual(["a.b"])
    })

    it("can release one id and keep the others", () => {
      const store = new ExtensionSettingsStore()
      store.startBusy("a.b")
      store.startBusy("c.d")

      store.endBusy("a.b")

      expect(store.busy).toEqual(["c.d"])
    })
  })
})
