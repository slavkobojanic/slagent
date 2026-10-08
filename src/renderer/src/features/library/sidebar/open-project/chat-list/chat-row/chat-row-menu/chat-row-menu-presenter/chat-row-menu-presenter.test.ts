import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { ChatMessage, ChatSummary } from "@shared/types"
import { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import { ChatRowMenuPresenter } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-presenter/chat-row-menu-presenter"
import { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function userMessage(text: string): ChatMessage {
  return { id: "m1", role: "user", text, attachments: [] }
}

describe("ChatRowMenuPresenter", () => {
  let store: ChatRowMenuStore
  let api: MockInstance<API>
  let rename: ChatRenameStore
  let deletion: ChatDeletionStore
  let libraryStore: LibraryStore
  let presenter: ChatRowMenuPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ChatRowMenuStore()
    api = createMockInstance<API>(["pinChat", "readTranscript"])
    api.pinChat.mockResolvedValue(undefined)
    rename = new ChatRenameStore()
    deletion = new ChatDeletionStore()
    libraryStore = new LibraryStore()
    presenter = new ChatRowMenuPresenter(store, api, window, libraryStore, rename, deletion, nullLog())
  })

  afterEach(() => {
    Reflect.deleteProperty(window.navigator, "clipboard")
  })

  function stubClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } })
    return writeText
  }

  describe("handleOpenChange", () => {
    it("can mark a chat's menu as open", () => {
      presenter.handleOpenChange(chat("c1"), true)

      expect(store.chatId).toBe("c1")
    })

    it("can close only the menu that is open", () => {
      presenter.handleOpenChange(chat("c1"), true)

      presenter.handleOpenChange(chat("c2"), false)
      expect(store.chatId).toBe("c1")

      presenter.handleOpenChange(chat("c1"), false)
      expect(store.chatId).toBeNull()
    })
  })

  describe("handlePin", () => {
    it("can pin an unpinned chat and unpin a pinned one", async () => {
      await presenter.handlePin(chat("c1"))
      await presenter.handlePin(chat("c2", { pinned: true }))

      expect(api.pinChat).toHaveBeenNthCalledWith(1, "c1", true, undefined)
      expect(api.pinChat).toHaveBeenNthCalledWith(2, "c2", false, undefined)
    })

    it("can pin a chat of a project that is not open, naming its project", async () => {
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: { p2: [chat("c3")] }, openChatId: null })

      await presenter.handlePin(chat("c3"))

      expect(api.pinChat).toHaveBeenCalledWith("c3", true, "p2")
    })
  })

  describe("handleRename", () => {
    it("can start renaming a chat with its current title", () => {
      presenter.handleRename(chat("c1", { title: "Plan" }))

      expect(rename.renamingId).toBe("c1")
      expect(rename.draft).toBe("Plan")
    })
  })

  describe("handleDelete", () => {
    it("can ask the delete confirmation to confirm a chat", () => {
      const target = chat("c1")

      presenter.handleDelete(target)

      expect(deletion.target).toEqual(target)
      expect(deletion.projectId).toBeUndefined()
    })

    it("can carry the project of a chat that is not open", () => {
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: { p2: [chat("c3")] }, openChatId: null })

      presenter.handleDelete(chat("c3"))

      expect(deletion.projectId).toBe("p2")
    })
  })

  describe("handleCopy", () => {
    it("can copy the transcript and confirm", async () => {
      const writeText = stubClipboard()
      api.readTranscript.mockResolvedValue([userMessage("hello")])

      await presenter.handleCopy(chat("c1", { title: "Plan" }))

      expect(writeText).toHaveBeenCalledWith("# Plan\n\nYou\nhello")
      expect(toast.success).toHaveBeenCalledWith("Transcript copied")
    })

    it("can say the chat is empty and copy nothing when it has no messages", async () => {
      const writeText = stubClipboard()
      api.readTranscript.mockResolvedValue([])

      await presenter.handleCopy(chat("c1"))

      expect(writeText).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("This chat is empty.")
    })

    it("can show the error when the transcript cannot be read", async () => {
      api.readTranscript.mockRejectedValue(new Error("disk"))

      await presenter.handleCopy(chat("c1"))

      expect(toast.error).toHaveBeenCalledWith("disk")
    })
  })
})
