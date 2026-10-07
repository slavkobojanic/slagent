import { beforeEach, describe, expect, it } from "vitest"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import { QueuePresenter } from "@/features/run-status/queue/queue-presenter/queue-presenter"
import { QueueStore } from "@/features/run-status/queue/queue-store/queue-store"
import { RunStore } from "@/mirror/run-store"
import { createMockInstance } from "@/test/create-mock-instance"

describe("QueuePresenter", () => {
  let store: QueueStore
  let chat: ReturnType<typeof createMockInstance<ChatService>>
  let presenter: QueuePresenter

  beforeEach(() => {
    store = new QueueStore(new RunStore())
    chat = createMockInstance<ChatService>(["setQueueMode", "removeQueued"])
    presenter = new QueuePresenter(store, chat)
  })

  describe("handleModeChange", () => {
    it("can ask the chat service to switch the mode of a queued message", async () => {
      chat.setQueueMode.mockResolvedValue(undefined)

      await presenter.handleModeChange("q1", "steer")

      expect(chat.setQueueMode).toHaveBeenCalledWith("q1", "steer")
    })

    it("can set the error when the switch fails", async () => {
      chat.setQueueMode.mockRejectedValue(new Error("Queue is busy"))

      await presenter.handleModeChange("q1", "steer")

      expect(store.error).toBe("Queue is busy")
    })

    it("can clear an earlier error before it asks again", async () => {
      store.setError("earlier failure")
      chat.setQueueMode.mockResolvedValue(undefined)

      await presenter.handleModeChange("q1", "steer")

      expect(store.error).toBeNull()
    })
  })

  describe("handleRemove", () => {
    it("can ask the chat service to remove a queued message", async () => {
      chat.removeQueued.mockResolvedValue(undefined)

      await presenter.handleRemove("q1")

      expect(chat.removeQueued).toHaveBeenCalledWith("q1")
    })

    it("can set the error when the removal fails", async () => {
      chat.removeQueued.mockRejectedValue(new Error("Already sent"))

      await presenter.handleRemove("q1")

      expect(store.error).toBe("Already sent")
    })
  })
})
