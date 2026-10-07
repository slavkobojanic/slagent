import { describe, expect, it } from "vitest"
import { UpdateStore } from "@/features/shell/update-store/update-store"

describe("UpdateStore", () => {
  describe("canInstall", () => {
    it("can be false while no update is waiting", () => {
      const store = new UpdateStore()

      expect(store.canInstall).toBe(false)
    })

    it("can be false while the waiting update is already installing", () => {
      const store = new UpdateStore()
      store.setVersion("1.2.0")
      store.setInstalling(true)

      expect(store.canInstall).toBe(false)
    })

    it("can be true when an update is waiting and no install is running", () => {
      const store = new UpdateStore()
      store.setVersion("1.2.0")

      expect(store.canInstall).toBe(true)
    })
  })

  describe("setError", () => {
    it("can keep an install error until it is cleared", () => {
      const store = new UpdateStore()

      store.setError("Could not restart")
      expect(store.error).toBe("Could not restart")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
