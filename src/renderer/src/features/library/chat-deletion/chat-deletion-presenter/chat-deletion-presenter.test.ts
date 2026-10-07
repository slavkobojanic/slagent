import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { toast } from "sonner"
import type { ChatSummary } from "@shared/types"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { ChatDeletionPresenter } from "@/features/library/chat-deletion/chat-deletion-presenter/chat-deletion-presenter"
import { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import { createMockInstance } from "@/test/create-mock-instance"

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
  let library: { deleteChat: Mock }
  let presenter: ChatDeletionPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ChatDeletionStore()
    library = createMockInstance<LibraryService>(["deleteChat"])
    library.deleteChat.mockResolvedValue(undefined)
    presenter = new ChatDeletionPresenter(store, library)
  })

  describe("handleRequest", () => {
    it("can open the confirmation for the chat it is given", () => {
      presenter.handleRequest(chat)

      expect(store.target).toBe(chat)
    })
  })

  describe("handleCancel", () => {
    it("can close the confirmation", () => {
      presenter.handleRequest(chat)

      presenter.handleCancel()

      expect(store.target).toBeNull()
    })

    it("can keep the confirmation open while a delete is running", () => {
      presenter.handleRequest(chat)
      store.setBusy(true)

      presenter.handleCancel()

      expect(store.target).toBe(chat)
    })
  })

  describe("handleConfirm", () => {
    it("can delete the waiting chat and close the confirmation when the call succeeds", async () => {
      presenter.handleRequest(chat)

      await presenter.handleConfirm()

      expect(library.deleteChat).toHaveBeenCalledWith("c1")
      expect(store.target).toBeNull()
      expect(store.busy).toBe(false)
    })

    it("can keep the confirmation open and show the error when the delete fails", async () => {
      library.deleteChat.mockRejectedValue(new Error("Locked"))
      presenter.handleRequest(chat)

      await presenter.handleConfirm()

      expect(toast.error).toHaveBeenCalledWith("Locked")
      expect(store.target).toBe(chat)
      expect(store.busy).toBe(false)
    })

    it("can skip the call when no chat is waiting", async () => {
      await presenter.handleConfirm()

      expect(library.deleteChat).not.toHaveBeenCalled()
    })
  })
})
