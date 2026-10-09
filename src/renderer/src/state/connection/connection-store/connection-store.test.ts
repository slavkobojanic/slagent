import { describe, expect, it } from "vitest"
import { ConnectionStore } from "@/state/connection/connection-store/connection-store"

const address = { host: "100.64.0.1", port: 8747, token: "t" }

describe("ConnectionStore", () => {
  describe("label", () => {
    it("can show the host and port", () => {
      expect(new ConnectionStore(address).label).toBe("100.64.0.1:8747")
    })
  })

  describe("online", () => {
    it("can be offline when the socket is connecting", () => {
      expect(new ConnectionStore(address).online).toBe(false)
    })

    it("can be online when the socket is open", () => {
      const store = new ConnectionStore(address)
      store.setStatus("open")
      expect(store.online).toBe(true)
    })
  })

  describe("setStatus", () => {
    it("can remember the server was reached when the socket drops after opening", () => {
      const store = new ConnectionStore(address)
      store.setStatus("open")
      store.setStatus("connecting")
      expect(store.reached).toBe(true)
      expect(store.online).toBe(false)
    })

    it("can leave reached unset when the socket never opened", () => {
      const store = new ConnectionStore(address)
      store.setStatus("connecting")
      expect(store.reached).toBe(false)
    })
  })
})
