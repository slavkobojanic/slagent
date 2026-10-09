import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { ChatRowPresenter } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-presenter/chat-row-presenter"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function libraryState(chats: ChatSummary[] = [], chatsByProject: LibraryState["chatsByProject"] = {}): LibraryState {
  return { projects: [], openProjectId: "p1", chats, chatsByProject, openChatId: null }
}

describe("ChatRowPresenter", () => {
  let libraryStore: LibraryStore
  let menu: ChatRowMenuStore
  let api: MockInstance<API>
  let presenter: ChatRowPresenter

  beforeEach(() => {
    libraryStore = new LibraryStore()
    menu = new ChatRowMenuStore()
    api = createMockInstance<API>(["openChat"])
    api.openChat.mockResolvedValue(undefined)
    const chatSwitch = new ChatSwitchPresenter(
      new LibraryStore(),
      new RunStore(),
      api,
      new PanelPresenter(new PanelStore(), api, nullLog()),
      new ReviewPresenter(new ReviewStore(), nullLog()),
      nullLog(),
    )
    presenter = new ChatRowPresenter(libraryStore, menu, chatSwitch, nullLog())
  })

  describe("handleOpen", () => {
    it("can open a chat of the open project by its id", async () => {
      libraryStore.setLibrary(libraryState([chat("c1")]))

      await presenter.handleOpen(chat("c1"))

      expect(api.openChat).toHaveBeenCalledWith("c1", "p1")
    })

    it("can open a chat the library does not list, without naming a project", async () => {
      await presenter.handleOpen(chat("c1"))

      expect(api.openChat).toHaveBeenCalledWith("c1", undefined)
    })

    it("can open a chat of a project that is not open, naming its project", async () => {
      libraryStore.setLibrary(libraryState([], { p2: [chat("c2")] }))

      await presenter.handleOpen(chat("c2"))

      expect(api.openChat).toHaveBeenCalledWith("c2", "p2")
    })
  })

  describe("handleContextMenu", () => {
    it("can open the chat's menu", () => {
      presenter.handleContextMenu(chat("c1"))

      expect(menu.chatId).toBe("c1")
    })
  })
})
