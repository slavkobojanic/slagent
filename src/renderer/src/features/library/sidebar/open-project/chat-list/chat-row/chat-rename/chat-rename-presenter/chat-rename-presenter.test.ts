import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRenamePresenter } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-presenter/chat-rename-presenter"
import { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import type { API } from "@/ipc/api"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

describe("ChatRenamePresenter", () => {
  let store: ChatRenameStore
  let api: MockInstance<API>
  let presenter: ChatRenamePresenter

  beforeEach(() => {
    store = new ChatRenameStore()
    api = createMockInstance<API>(["renameChat"])
    api.renameChat.mockResolvedValue(undefined)
    presenter = new ChatRenamePresenter(store, api)
  })

  describe("handleSave", () => {
    it("can save the trimmed title and stop renaming", () => {
      store.startRename("c1", "c1")
      presenter.handleDraftChange("  Launch plan  ")

      presenter.handleSave(chat("c1"))

      expect(api.renameChat).toHaveBeenCalledWith("c1", "Launch plan")
      expect(store.renamingId).toBeNull()
    })

    it("can stop renaming without saving when the title is blank", () => {
      store.startRename("c1", "c1")
      presenter.handleDraftChange("   ")

      presenter.handleSave(chat("c1"))

      expect(api.renameChat).not.toHaveBeenCalled()
      expect(store.renamingId).toBeNull()
    })

    it("can ignore a save for a row that is not the one being renamed", () => {
      store.startRename("c2", "c2")

      presenter.handleSave(chat("c1"))

      expect(api.renameChat).not.toHaveBeenCalled()
      expect(store.renamingId).toBe("c2")
    })

    it("can save only once when the submit is followed by a blur", () => {
      store.startRename("c1", "c1")
      presenter.handleDraftChange("New")

      presenter.handleSave(chat("c1"))
      presenter.handleSave(chat("c1"))

      expect(api.renameChat).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleCancel", () => {
    it("can leave the title alone when Escape cancelled the rename", () => {
      store.startRename("c1", "c1")
      presenter.handleDraftChange("Other")
      presenter.handleCancel()

      presenter.handleSave(chat("c1"))

      expect(api.renameChat).not.toHaveBeenCalled()
    })

    it("can save the next rename after an earlier one was cancelled", () => {
      store.startRename("c1", "c1")
      presenter.handleCancel()
      store.startRename("c1", "c1")
      presenter.handleDraftChange("New")

      presenter.handleSave(chat("c1"))

      expect(api.renameChat).toHaveBeenCalledWith("c1", "New")
    })
  })
})
