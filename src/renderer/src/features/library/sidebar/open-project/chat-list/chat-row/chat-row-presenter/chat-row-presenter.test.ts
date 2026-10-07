import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DONE_WINDOW_MS, type ChatSummary, type LibraryState } from "@shared/types"
import { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { ChatRowPresenter } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-presenter/chat-row-presenter"
import { ChatRowStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-store/chat-row-store"
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

function libraryState(chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId: "p1", chats, openChatId: null }
}

describe("ChatRowPresenter", () => {
  let libraryStore: LibraryStore
  let store: ChatRowStore
  let menu: ChatRowMenuStore
  let api: MockInstance<API>
  let presenter: ChatRowPresenter

  beforeEach(() => {
    libraryStore = new LibraryStore()
    store = new ChatRowStore(libraryStore)
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
    presenter = new ChatRowPresenter(store, libraryStore, window, menu, chatSwitch, nullLog())
  })

  afterEach(() => {
    presenter.stop()
    vi.useRealTimers()
  })

  describe("handleOpen", () => {
    it("can open a chat by its id", async () => {
      await presenter.handleOpen(chat("c1"))

      expect(api.openChat).toHaveBeenCalledWith("c1")
    })
  })

  describe("handleContextMenu", () => {
    it("can open the chat's menu", () => {
      presenter.handleContextMenu(chat("c1"))

      expect(menu.chatId).toBe("c1")
    })
  })

  describe("done window clock", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(1_000_000))
    })

    it("can move a finished chat to idle when its window closes", () => {
      const finished = chat("c1", { status: "done", finishedAt: 1_000_000 })
      presenter.start()

      libraryStore.setLibrary(libraryState([finished]))
      expect(store.now).toBe(1_000_000)

      vi.advanceTimersByTime(DONE_WINDOW_MS + 50)

      expect(store.now).toBe(1_000_000 + DONE_WINDOW_MS + 50)
      expect(store.statusOf(finished)).toBe("idle")
    })

    it("can leave the clock alone when no finished chat is waiting", () => {
      presenter.start()

      vi.advanceTimersByTime(60_000)

      expect(store.now).toBe(1_000_000)
    })

    it("can stop the clock once stopped", () => {
      presenter.start()
      libraryStore.setLibrary(libraryState([chat("c1", { status: "done", finishedAt: 1_000_000 })]))

      presenter.stop()
      vi.advanceTimersByTime(DONE_WINDOW_MS + 50)

      expect(store.now).toBe(1_000_000)
    })
  })
})
