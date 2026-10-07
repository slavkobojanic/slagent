import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import { LibraryStore } from "@/mirror/library-store"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function libraryState(openProjectId: string | null, openChatId: string | null, chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId, chats, openChatId }
}

describe("ChatSwitchPresenter", () => {
  let mirror: LibraryStore
  let panel: { reset: Mock }
  let review: { reset: Mock }
  let presenter: ChatSwitchPresenter

  beforeEach(() => {
    mirror = new LibraryStore()
    panel = { reset: vi.fn() }
    review = { reset: vi.fn() }
    presenter = new ChatSwitchPresenter(mirror, panel, review)
    presenter.start()
    // The first library event counts as a switch, so it runs before each test starts from a known chat.
    mirror.setLibrary(libraryState("p1", "c1", [chat("c1")]))
    panel.reset.mockClear()
    review.reset.mockClear()
  })

  afterEach(() => {
    presenter.stop()
  })

  describe("library changes", () => {
    it("can reset the panel and the review drafts when the open chat changes", () => {
      mirror.setLibrary(libraryState("p1", "c2", [chat("c1"), chat("c2")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can reset when the open project changes", () => {
      mirror.setLibrary(libraryState("p2", "c1", [chat("c1")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can keep the panel and the drafts when a draft becomes its first chat", () => {
      mirror.setLibrary(libraryState("p1", null))
      panel.reset.mockClear()
      review.reset.mockClear()

      mirror.setLibrary(libraryState("p1", "c9", [chat("c9")]))

      expect(panel.reset).not.toHaveBeenCalled()
      expect(review.reset).not.toHaveBeenCalled()
    })

    it("can reset when an existing chat is opened from a draft", () => {
      mirror.setLibrary(libraryState("p1", null, [chat("c1")]))
      panel.reset.mockClear()
      review.reset.mockClear()

      mirror.setLibrary(libraryState("p1", "c1", [chat("c1")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can leave the panel and the drafts alone when the library changes without moving", () => {
      mirror.setLibrary(libraryState("p1", "c1", [chat("c1", { title: "Renamed" })]))

      expect(panel.reset).not.toHaveBeenCalled()
      expect(review.reset).not.toHaveBeenCalled()
    })

    it("can stop resetting once stopped", () => {
      presenter.stop()

      mirror.setLibrary(libraryState("p1", "c2", [chat("c2")]))

      expect(panel.reset).not.toHaveBeenCalled()
    })
  })
})
