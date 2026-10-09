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
  const device = createMockInstance<Device>(["onResume", "saveAddress", "reload", "loadNicknames", "saveNickname"])
  device.loadNicknames.mockResolvedValue({})
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

  describe("rename", () => {
    it("can load the saved nicknames when it starts", async () => {
      const { store, device, presenter } = setup()
      device.loadNicknames.mockResolvedValue({ "100.64.0.1:8747": "Work Mac" })
      presenter.start()
      await Promise.resolve()
      await Promise.resolve()

      expect(store.nicknames["100.64.0.1:8747"]).toBe("Work Mac")
      expect(store.label).toBe("Work Mac")
    })

    it("can open the rename box seeded with the machine's current nickname", () => {
      const { store, presenter } = setup()
      store.setNicknames({ "100.64.0.1:8747": "Work Mac" })

      presenter.handleRenameStart()

      expect(store.renaming).toBe(true)
      expect(store.draftNickname).toBe("Work Mac")
    })

    it("can save the typed nickname and show it at once", async () => {
      const { store, device, presenter } = setup()
      store.setNicknames({})
      store.setRenaming(true)
      store.setDraftNickname("Work Mac")
      device.saveNickname.mockResolvedValue(undefined)
      device.loadNicknames.mockResolvedValue({ "100.64.0.1:8747": "Work Mac" })

      await presenter.handleRenameSave()

      expect(store.renaming).toBe(false)
      expect(device.saveNickname).toHaveBeenCalledWith(store.address, "Work Mac")
      expect(store.label).toBe("Work Mac")
    })

    it("can close the rename box without saving", async () => {
      const { store, presenter } = setup()
      presenter.handleRenameStart()

      presenter.handleRenameCancel()

      expect(store.renaming).toBe(false)
    })
  })
})
