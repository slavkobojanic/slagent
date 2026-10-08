import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppClosePresenter } from "@/features/app-close/app-close-presenter/app-close-presenter"
import { AppCloseStore } from "@/features/app-close/app-close-store/app-close-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

describe("AppClosePresenter", () => {
  let store: AppCloseStore
  let api: MockInstance<API>
  let presenter: AppClosePresenter
  let askClose: () => void
  let stopAsking: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    store = new AppCloseStore()
    api = createMockInstance<API>(["onCloseRequest", "closeApp"])
    api.closeApp.mockResolvedValue(undefined)
    askClose = () => undefined
    stopAsking = () => undefined
    api.onCloseRequest.mockImplementation((listener: () => void) => {
      askClose = listener
      return stopAsking
    })
    presenter = new AppClosePresenter(store, api, nullLog())
  })

  describe("start", () => {
    it("can open the confirmation when the main process asks for a close", () => {
      presenter.start()

      askClose()

      expect(store.open).toBe(true)
    })

    it("can stop listening again", () => {
      expect(presenter.start()).toBe(stopAsking)
    })
  })

  describe("handleCancel", () => {
    it("can close the confirmation without closing the app", () => {
      store.setOpen(true)

      presenter.handleCancel()

      expect(store.open).toBe(false)
      expect(api.closeApp).not.toHaveBeenCalled()
    })

    it("can keep the confirmation open while the close runs", () => {
      store.setOpen(true)
      store.setBusy(true)

      presenter.handleCancel()

      expect(store.open).toBe(true)
    })
  })

  describe("handleConfirm", () => {
    it("can ask the main process to close and stay busy until it answers", async () => {
      const gate: { resolve?: () => void } = {}
      api.closeApp.mockImplementation(() => new Promise<void>((resolve) => (gate.resolve = resolve)))

      const pending = presenter.handleConfirm()
      expect(store.busy).toBe(true)

      gate.resolve?.()
      await pending

      expect(api.closeApp).toHaveBeenCalledTimes(1)
      expect(store.busy).toBe(false)
    })

    it("can come back from a failed close and ask again later", async () => {
      api.closeApp.mockRejectedValue(new Error("refused"))
      store.setOpen(true)

      await presenter.handleConfirm()

      expect(store.busy).toBe(false)
      expect(store.open).toBe(true)
    })

    it("can skip the call while a close is already running", async () => {
      store.setBusy(true)

      await presenter.handleConfirm()

      expect(api.closeApp).not.toHaveBeenCalled()
    })
  })
})
