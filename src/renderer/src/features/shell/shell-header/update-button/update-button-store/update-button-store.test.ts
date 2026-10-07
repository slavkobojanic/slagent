import { describe, expect, it } from "vitest"
import { UpdateButtonStore } from "@/features/shell/shell-header/update-button/update-button-store/update-button-store"

describe("UpdateButtonStore", () => {
  describe("canInstall", () => {
    it("can be false while no update is waiting", () => {
      const store = new UpdateButtonStore()

      expect(store.canInstall).toBe(false)
    })

    it("can be false while the waiting update is already installing", () => {
      const store = new UpdateButtonStore()
      store.setVersion("1.2.0")
      store.setInstalling(true)

      expect(store.canInstall).toBe(false)
    })

    it("can be true when an update is waiting and no install is running", () => {
      const store = new UpdateButtonStore()
      store.setVersion("1.2.0")

      expect(store.canInstall).toBe(true)
    })
  })

  describe("setError", () => {
    it("can keep an install error until it is cleared", () => {
      const store = new UpdateButtonStore()

      store.setError("Could not restart")
      expect(store.error).toBe("Could not restart")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
