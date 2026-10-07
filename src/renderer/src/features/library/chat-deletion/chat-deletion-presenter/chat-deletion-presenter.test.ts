import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { ChatSummary } from "@shared/types"
import { ChatDeletionPresenter } from "@/features/library/chat-deletion/chat-deletion-presenter/chat-deletion-presenter"
import { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const chat: ChatSummary = {
  id: "c1",
  title: "Plan",
  pinned: false,
  pinnedAt: 0,
  updatedAt: 0,
  running: false,
  status: "idle",
  finishedAt: null,
}

describe("ChatDeletionPresenter", () => {
  let store: ChatDeletionStore
  let api: MockInstance<API>
  let presenter: ChatDeletionPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ChatDeletionStore()
    api = createMockInstance<API>(["deleteChat"])
    api.deleteChat.mockResolvedValue(undefined)
    presenter = new ChatDeletionPresenter(store, api, nullLog())
  })

  describe("handleCancel", () => {
    it("can close the confirmation", () => {
      store.setTarget(chat)

      presenter.handleCancel()

      expect(store.target).toBeNull()
    })

    it("can keep the confirmation open while a delete is running", () => {
      store.setTarget(chat)
      store.setBusy(true)

      presenter.handleCancel()

      expect(store.target).toEqual(chat)
    })
  })

  describe("handleConfirm", () => {
    it("can delete the waiting chat and close the confirmation when the call succeeds", async () => {
      store.setTarget(chat)

      await presenter.handleConfirm()

      expect(api.deleteChat).toHaveBeenCalledWith("c1")
      expect(store.target).toBeNull()
      expect(store.busy).toBe(false)
    })

    it("can keep the confirmation open and show the error when the delete fails", async () => {
      api.deleteChat.mockRejectedValue(new Error("Locked"))
      store.setTarget(chat)

      await presenter.handleConfirm()

      expect(toast.error).toHaveBeenCalledWith("Locked")
      expect(store.target).toEqual(chat)
      expect(store.busy).toBe(false)
    })

    it("can skip the call when no chat is waiting", async () => {
      await presenter.handleConfirm()

      expect(api.deleteChat).not.toHaveBeenCalled()
    })
  })
})
