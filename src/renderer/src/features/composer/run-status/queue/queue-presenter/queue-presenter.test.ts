import { beforeEach, describe, expect, it } from "vitest"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { QueuePresenter } from "@/features/composer/run-status/queue/queue-presenter/queue-presenter"
import { QueueStore } from "@/features/composer/run-status/queue/queue-store/queue-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { createMockInstance } from "@/test/create-mock-instance"

describe("QueuePresenter", () => {
  let store: QueueStore
  let api: ReturnType<typeof createMockInstance<API>>
  let presenter: QueuePresenter

  beforeEach(() => {
    store = new QueueStore(new RunStore())
    api = createMockInstance<API>(["setQueueMode", "removeQueued"])
    presenter = new QueuePresenter(store, api, nullLog())
  })

  describe("handleModeChange", () => {
    it("can ask the main process to switch the mode of a queued message", async () => {
      api.setQueueMode.mockResolvedValue(undefined)

      await presenter.handleModeChange("q1", "steer")

      expect(api.setQueueMode).toHaveBeenCalledWith("q1", "steer")
    })

    it("can set the error when the switch fails", async () => {
      api.setQueueMode.mockRejectedValue(new Error("Queue is busy"))

      await presenter.handleModeChange("q1", "steer")

      expect(store.error).toBe("Queue is busy")
    })

    it("can clear an earlier error before it asks again", async () => {
      store.setError("earlier failure")
      api.setQueueMode.mockResolvedValue(undefined)

      await presenter.handleModeChange("q1", "steer")

      expect(store.error).toBeNull()
    })
  })

  describe("handleRemove", () => {
    it("can ask the main process to remove a queued message", async () => {
      api.removeQueued.mockResolvedValue(undefined)

      await presenter.handleRemove("q1")

      expect(api.removeQueued).toHaveBeenCalledWith("q1")
    })

    it("can set the error when the removal fails", async () => {
      api.removeQueued.mockRejectedValue(new Error("Already sent"))

      await presenter.handleRemove("q1")

      expect(store.error).toBe("Already sent")
    })
  })
})
