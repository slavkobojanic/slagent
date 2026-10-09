import { describe, expect, it } from "vitest"
import { ConnectStore } from "@/features/mobile/connect/connect-store/connect-store"

describe("ConnectStore", () => {
  describe("address", () => {
    it("can parse the typed address", () => {
      const store = new ConnectStore()
      store.setText("ws://100.64.0.1:8747?token=t")
      expect(store.address).toEqual({ host: "100.64.0.1", port: 8747, token: "t" })
    })
  })

  describe("canConnect", () => {
    it("can refuse when nothing is typed", () => {
      expect(new ConnectStore().canConnect).toBe(false)
    })

    it("can refuse while busy", () => {
      const store = new ConnectStore()
      store.setText("x")
      store.setBusy(true)
      expect(store.canConnect).toBe(false)
    })

    it("can allow when text is typed", () => {
      const store = new ConnectStore()
      store.setText("x")
      expect(store.canConnect).toBe(true)
    })
  })

  describe("setText", () => {
    it("can clear the error when the text changes", () => {
      const store = new ConnectStore()
      store.setError("bad")
      store.setText("x")
      expect(store.error).toBeNull()
    })
  })
})
