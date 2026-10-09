import { describe, expect, it } from "vitest"
import type { Device } from "@/ipc/device"
import { ConnectPresenter } from "@/features/mobile/connect/connect-presenter/connect-presenter"
import { ConnectStore } from "@/features/mobile/connect/connect-store/connect-store"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

const link = "slagent://connect?host=100.64.0.1&port=8747&token=t"

function setup(reachable = true) {
  const store = new ConnectStore()
  const device = createMockInstance<Device>(["probe", "saveAddress", "reload", "onUrlOpen"])
  device.probe.mockResolvedValue(reachable)
  device.saveAddress.mockResolvedValue(undefined)
  device.onUrlOpen.mockReturnValue(() => undefined)
  const presenter = new ConnectPresenter(store, device, nullLog())
  return { store, device, presenter }
}

async function settle() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve()
}

describe("ConnectPresenter", () => {
  describe("handleSubmit", () => {
    it("can save the address and reload when the Mac answers", async () => {
      const { store, device, presenter } = setup()
      store.setText("ws://100.64.0.1:8747?token=t")
      presenter.handleSubmit()
      await settle()
      expect(device.probe).toHaveBeenCalledWith({ host: "100.64.0.1", port: 8747, token: "t" })
      expect(device.saveAddress).toHaveBeenCalledWith({ host: "100.64.0.1", port: 8747, token: "t" })
      expect(device.reload).toHaveBeenCalled()
    })

    it("can explain when the Mac does not answer", async () => {
      const { store, device, presenter } = setup(false)
      store.setText("ws://100.64.0.1:8747?token=t")
      presenter.handleSubmit()
      await settle()
      expect(store.error).toContain("Couldn't reach slagent at 100.64.0.1:8747")
      expect(device.saveAddress).not.toHaveBeenCalled()
      expect(store.busy).toBe(false)
    })

    it("can explain the format when the text is not an address", async () => {
      const { store, device, presenter } = setup()
      store.setText("hello")
      presenter.handleSubmit()
      await settle()
      expect(store.error).toContain("starts with ws://")
      expect(device.probe).not.toHaveBeenCalled()
    })

    it("can do nothing when the field is empty", async () => {
      const { device, presenter } = setup()
      presenter.handleSubmit()
      await settle()
      expect(device.probe).not.toHaveBeenCalled()
    })
  })

  describe("handleLink", () => {
    it("can fill the field and connect when a connect link opens the app", async () => {
      const { store, device, presenter } = setup()
      presenter.handleLink(link)
      await settle()
      expect(store.text).toBe(link)
      expect(device.saveAddress).toHaveBeenCalled()
    })

    it("can ignore links that are not connect links", async () => {
      const { store, device, presenter } = setup()
      presenter.handleLink("slagent://other")
      await settle()
      expect(store.text).toBe("")
      expect(device.probe).not.toHaveBeenCalled()
    })
  })

  describe("start", () => {
    it("can listen for links until it stops", () => {
      const { device, presenter } = setup()
      const stopLinks = () => undefined
      device.onUrlOpen.mockReturnValue(stopLinks)
      presenter.start()
      expect(device.onUrlOpen).toHaveBeenCalledWith(presenter.handleLink)
      presenter.stop()
    })
  })
})
