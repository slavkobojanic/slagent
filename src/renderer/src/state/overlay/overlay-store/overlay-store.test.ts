import { describe, expect, it } from "vitest"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

describe("OverlayStore", () => {
  describe("setOpen", () => {
    it("can open and close the settings dialog without touching the others", () => {
      const store = new OverlayStore()

      store.setOpen("settings", true)

      expect(store.settingsOpen).toBe(true)
      expect(store.modelOpen).toBe(false)
      expect(store.paletteOpen).toBe(false)
    })

    it("can open and close the model dialog", () => {
      const store = new OverlayStore()

      store.setOpen("model", true)
      store.setOpen("model", false)

      expect(store.modelOpen).toBe(false)
    })

    it("can open and close the command palette", () => {
      const store = new OverlayStore()

      store.setOpen("palette", true)

      expect(store.paletteOpen).toBe(true)
      expect(store.settingsOpen).toBe(false)
    })
  })
})
