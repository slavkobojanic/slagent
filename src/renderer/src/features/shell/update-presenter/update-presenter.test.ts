import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { UpdateService } from "@/ipc/update-service/update-service"
import { UpdatePresenter } from "@/features/shell/update-presenter/update-presenter"
import { UpdateStore } from "@/features/shell/update-store/update-store"
import { createMockInstance } from "@/test/create-mock-instance"

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("UpdatePresenter", () => {
  let store: UpdateStore
  let updates: { updateStatus: Mock; installUpdate: Mock; onUpdateReady: Mock }
  let dispose: Mock
  let presenter: UpdatePresenter

  beforeEach(() => {
    store = new UpdateStore()
    updates = createMockInstance<UpdateService>(["updateStatus", "installUpdate", "onUpdateReady"])
    dispose = vi.fn()
    updates.updateStatus.mockResolvedValue(null)
    updates.installUpdate.mockResolvedValue(undefined)
    updates.onUpdateReady.mockReturnValue(dispose)
    presenter = new UpdatePresenter(store, updates)
  })

  afterEach(() => {
    presenter.stop()
  })

  // Calls the listener the presenter gave to onUpdateReady, as the main process does when a download finishes.
  function emitUpdateReady(version: string) {
    const [listener] = updates.onUpdateReady.mock.calls[0] ?? []
    listener(version)
  }

  describe("start", () => {
    it("can show an update that was already downloaded when the app started", async () => {
      updates.updateStatus.mockResolvedValue("1.2.0")

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
      updates.updateStatus.mockRejectedValue(new Error("offline"))

      presenter.start()
      await flush()

      expect(store.version).toBeNull()
    })

    it("can subscribe only once when started twice", () => {
      presenter.start()
      presenter.start()

      expect(updates.onUpdateReady).toHaveBeenCalledTimes(1)
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
      updates.updateStatus.mockReturnValue(new Promise((resolve) => (answer = resolve)))
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

      expect(updates.installUpdate).toHaveBeenCalledTimes(1)
      expect(store.installing).toBe(true)
    })

    it("can report a failed install and let the user try again", async () => {
      store.setVersion("1.2.0")
      updates.installUpdate.mockRejectedValue(new Error("Could not restart"))

      await presenter.installUpdate()

      expect(store.error).toBe("Could not restart")
      expect(store.installing).toBe(false)
      expect(store.canInstall).toBe(true)
    })

    it("can do nothing when no update is waiting", async () => {
      await presenter.installUpdate()

      expect(updates.installUpdate).not.toHaveBeenCalled()
    })

    it("can do nothing while an install is already running", async () => {
      store.setVersion("1.2.0")
      store.setInstalling(true)

      await presenter.installUpdate()

      expect(updates.installUpdate).not.toHaveBeenCalled()
    })
  })
})
