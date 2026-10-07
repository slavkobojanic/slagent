import type { API } from "@/ipc/api"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ComputerPermissions } from "@shared/types"
import { PermissionsPresenter } from "@/state/permissions/permissions-presenter/permissions-presenter"
import { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { nullLog } from "@/log/log"

const MISSING: ComputerPermissions = { accessibility: false, screenRecording: false, error: null }
const GRANTED: ComputerPermissions = { accessibility: true, screenRecording: true, error: null }
const TIMER_ID = 7

function setup(platform = "darwin") {
  const store = new PermissionsStore(platform)
  const service = createMockInstance<API>(["getPermissions"])
  const presenter = new PermissionsPresenter(store, service, platform, window, nullLog())
  return { store, service, presenter }
}

// No real poll runs. A test runs one tick by calling refresh, the function the poll hands to setInterval.
function spyOnTimers() {
  const setInterval = vi.spyOn(window, "setInterval").mockReturnValue(TIMER_ID)
  const clearInterval = vi.spyOn(window, "clearInterval").mockImplementation(() => undefined)
  return { setInterval, clearInterval }
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("PermissionsPresenter", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("start", () => {
    it("can read the permissions once and write them to the store", async () => {
      const { store, service, presenter } = setup()
      spyOnTimers()
      service.getPermissions.mockResolvedValue(MISSING)

      presenter.start()
      await flush()

      expect(store.permissions).toEqual(MISSING)
      expect(service.getPermissions).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can poll every second while a permission is missing", () => {
      const { service, presenter } = setup()
      const { setInterval } = spyOnTimers()
      service.getPermissions.mockResolvedValue(MISSING)

      presenter.start()

      expect(setInterval).toHaveBeenCalledWith(presenter.refresh, 1000)
      presenter.stop()
    })

    it("can keep the poll running after a read that still finds a permission missing", async () => {
      const { service, presenter } = setup()
      const { clearInterval } = spyOnTimers()
      service.getPermissions.mockResolvedValue(MISSING)
      presenter.start()

      await presenter.refresh()

      expect(clearInterval).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can stop polling once both permissions are granted", async () => {
      const { store, service, presenter } = setup()
      const { clearInterval } = spyOnTimers()
      service.getPermissions.mockResolvedValueOnce(MISSING).mockResolvedValue(GRANTED)
      presenter.start()
      await flush()

      await presenter.refresh()

      expect(store.permissions).toEqual(GRANTED)
      expect(clearInterval).toHaveBeenCalledWith(TIMER_ID)
      presenter.stop()
    })

    it("can read nothing outside macOS", () => {
      const { service, presenter } = setup("linux")
      const { setInterval } = spyOnTimers()

      presenter.start()

      expect(service.getPermissions).not.toHaveBeenCalled()
      expect(setInterval).not.toHaveBeenCalled()
    })

    it("can run once when it is started twice", async () => {
      const { service, presenter } = setup()
      const { setInterval } = spyOnTimers()
      service.getPermissions.mockResolvedValue(MISSING)

      presenter.start()
      presenter.start()
      await flush()

      expect(service.getPermissions).toHaveBeenCalledTimes(1)
      expect(setInterval).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can write the error text and keep polling when a read fails", async () => {
      const { store, service, presenter } = setup()
      const { clearInterval } = spyOnTimers()
      service.getPermissions.mockRejectedValue(new Error("Permission bridge is down"))

      presenter.start()
      await flush()

      expect(store.permissions).toEqual({ accessibility: false, screenRecording: false, error: "Permission bridge is down" })
      expect(clearInterval).not.toHaveBeenCalled()
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can cancel the poll", () => {
      const { service, presenter } = setup()
      const { clearInterval } = spyOnTimers()
      service.getPermissions.mockResolvedValue(MISSING)
      presenter.start()

      presenter.stop()

      expect(clearInterval).toHaveBeenCalledWith(TIMER_ID)
    })

    it("can drop a read that answers after it stopped", async () => {
      const { store, service, presenter } = setup()
      spyOnTimers()
      let answer: (value: ComputerPermissions) => void = () => undefined
      service.getPermissions.mockReturnValueOnce(
        new Promise<ComputerPermissions>((resolve) => {
          answer = resolve
        }),
      )
      presenter.start()

      presenter.stop()
      answer(GRANTED)
      await flush()

      expect(store.permissions).toBeNull()
    })
  })
})
