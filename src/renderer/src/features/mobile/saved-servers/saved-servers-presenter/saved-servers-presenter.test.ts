import { describe, expect, it } from "vitest"
import type { Device } from "@/ipc/device"
import { SavedServersPresenter } from "@/features/mobile/saved-servers/saved-servers-presenter/saved-servers-presenter"
import { SavedServersStore } from "@/features/mobile/saved-servers/saved-servers-store/saved-servers-store"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

const WORK = { host: "100.64.93.107", port: 8747, token: "t" }

function setup() {
  const store = new SavedServersStore()
  const device = createMockInstance<Device>(["loadServers", "loadNicknames", "saveNickname"])
  device.loadServers.mockResolvedValue([WORK])
  device.loadNicknames.mockResolvedValue({ "100.64.93.107:8747": "Work" })
  device.saveNickname.mockResolvedValue(undefined)
  const presenter = new SavedServersPresenter(store, device, null, nullLog())
  store.setServers([WORK])
  return { store, device, presenter }
}

describe("SavedServersPresenter", () => {
  describe("handleRenameSave", () => {
    it("can save the nickname that was typed", async () => {
      const { store, device, presenter } = setup()
      presenter.handleRenameStart(WORK)
      presenter.handleRenameChange("Office")
      await presenter.handleRenameSave()
      expect(device.saveNickname).toHaveBeenCalledWith(WORK, "Office")
      expect(store.editing).toBeNull()
    })
  })
})
