import { describe, expect, it } from "vitest"
import { AppCloseStore } from "@/features/app-close/app-close-store/app-close-store"

describe("AppCloseStore", () => {
  describe("open", () => {
    it("can be closed at first", () => {
      expect(new AppCloseStore().open).toBe(false)
    })

    it("can be opened and closed again", () => {
      const store = new AppCloseStore()

      store.setOpen(true)
      expect(store.open).toBe(true)

      store.setOpen(false)
      expect(store.open).toBe(false)
    })
  })

  describe("canConfirm", () => {
    it("can be false while the close runs", () => {
      const store = new AppCloseStore()
      store.setBusy(true)

      expect(store.canConfirm).toBe(false)
    })

    it("can be true when nothing runs", () => {
      expect(new AppCloseStore().canConfirm).toBe(true)
    })
  })
})
