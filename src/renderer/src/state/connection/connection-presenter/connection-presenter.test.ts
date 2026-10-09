import { describe, expect, it, vi } from "vitest"
import type { WsClient, WsStatus } from "@shared/ws-client"
import type { Device } from "@/ipc/device"
import { nullLog } from "@/log/log"
import { ConnectionPresenter } from "@/state/connection/connection-presenter/connection-presenter"
import { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import { createMockInstance } from "@/test/create-mock-instance"

const address = { host: "100.64.0.1", port: 8747, token: "t" }

function setup(status: WsStatus = "connecting") {
  const store = new ConnectionStore(address)
  const client = { status, statusListeners: new Set<(status: WsStatus) => void>(), wake: vi.fn(), close: vi.fn() }
  const device = createMockInstance<Device>(["onResume", "saveAddress", "reload"])
  const stopResume = vi.fn()
  device.onResume.mockReturnValue(stopResume)
  device.saveAddress.mockResolvedValue(undefined)
  const presenter = new ConnectionPresenter(store, client as unknown as WsClient, device, nullLog())
  return { store, client, device, presenter, stopResume }
}

describe("ConnectionPresenter", () => {
  describe("start", () => {
    it("can take the socket's status when it starts", () => {
      const { store, presenter } = setup("open")
      presenter.start()
      expect(store.status).toBe("open")
      presenter.stop()
    })

    it("can follow status changes until it stops", () => {
      const { store, client, presenter } = setup()
      presenter.start()
      for (const listener of client.statusListeners) listener("open")
      expect(store.online).toBe(true)
      presenter.stop()
      expect(client.statusListeners.size).toBe(0)
    })

    it("can wake the socket when the app resumes", () => {
      const { client, device, presenter, stopResume } = setup()
      presenter.start()
      expect(device.onResume).toHaveBeenCalledWith(client.wake)
      presenter.stop()
      expect(stopResume).toHaveBeenCalled()
    })
  })

  describe("forget", () => {
    it("can drop the saved server and reload when asked", async () => {
      const { client, device, presenter } = setup()
      await presenter.forget()
      expect(client.close).toHaveBeenCalled()
      expect(device.saveAddress).toHaveBeenCalledWith(null)
      expect(device.reload).toHaveBeenCalled()
    })
  })
})
