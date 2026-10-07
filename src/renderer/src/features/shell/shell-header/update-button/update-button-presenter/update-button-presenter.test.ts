import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { API } from "@/ipc/api"
import { UpdateButtonPresenter } from "@/features/shell/shell-header/update-button/update-button-presenter/update-button-presenter"
import { UpdateButtonStore } from "@/features/shell/shell-header/update-button/update-button-store/update-button-store"
import { nullLog } from "@/log/log"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("UpdateButtonPresenter", () => {
  let store: UpdateButtonStore
  let api: MockInstance<API>
  let dispose: Mock
  let presenter: UpdateButtonPresenter

  beforeEach(() => {
    store = new UpdateButtonStore()
    api = createMockInstance<API>(["updateStatus", "installUpdate", "onUpdateReady"])
    dispose = vi.fn()
    api.updateStatus.mockResolvedValue(null)
    api.installUpdate.mockResolvedValue(undefined)
    api.onUpdateReady.mockReturnValue(dispose)
    presenter = new UpdateButtonPresenter(store, api, nullLog())
  })

  afterEach(() => {
    presenter.stop()
  })

  function emitUpdateReady(version: string) {
    const [listener] = api.onUpdateReady.mock.calls[0] ?? []
    listener(version)
  }

  describe("start", () => {
    it("can show an update that was already downloaded when the app started", async () => {
      api.updateStatus.mockResolvedValue("1.2.0")

      presenter.start()
      await flush()

      expect(store.version).toBe("1.2.0")
    })

    it("can show an update that becomes ready while the app runs", () => {
      presenter.start()

      emitUpdateReady("1.3.0")

      expect(store.version).toBe("1.3.0")
    })

    it("can leave the version empty when no update is waiting", async () => {
      presenter.start()
      await flush()

      expect(store.version).toBeNull()
    })

    it("can keep running when the update status cannot be read", async () => {
      api.updateStatus.mockRejectedValue(new Error("offline"))

      presenter.start()
      await flush()

      expect(store.version).toBeNull()
    })

    it("can subscribe only once when started twice", () => {
      presenter.start()
      presenter.start()

      expect(api.onUpdateReady).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can drop the update-ready listener on stop", () => {
      presenter.start()

      presenter.stop()

      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it("can ignore an update status that arrives after stop", async () => {
      let answer: (version: string | null) => void = () => undefined
      api.updateStatus.mockReturnValue(new Promise((resolve) => (answer = resolve)))
      presenter.start()

      presenter.stop()
      answer("1.2.0")
      await flush()

      expect(store.version).toBeNull()
    })
  })

  describe("installUpdate", () => {
    it("can install the waiting update and keep the install marked as running", async () => {
      store.setVersion("1.2.0")

      await presenter.installUpdate()

      expect(api.installUpdate).toHaveBeenCalledTimes(1)
      expect(store.installing).toBe(true)
    })

    it("can report a failed install and let the user try again", async () => {
      store.setVersion("1.2.0")
      api.installUpdate.mockRejectedValue(new Error("Could not restart"))

      await presenter.installUpdate()

      expect(store.error).toBe("Could not restart")
      expect(store.installing).toBe(false)
      expect(store.canInstall).toBe(true)
    })

    it("can do nothing when no update is waiting", async () => {
      await presenter.installUpdate()

      expect(api.installUpdate).not.toHaveBeenCalled()
    })

    it("can do nothing while an install is already running", async () => {
      store.setVersion("1.2.0")
      store.setInstalling(true)

      await presenter.installUpdate()

      expect(api.installUpdate).not.toHaveBeenCalled()
    })
  })
})
