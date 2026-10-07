import { describe, expect, it } from "vitest"
import { DONE_WINDOW_MS, type ChatSummary } from "@shared/types"
import { ChatRowStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-store/chat-row-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

describe("ChatRowStore", () => {
  describe("statusOf", () => {
    it("can show a done chat as idle once the clock passes its window", () => {
      const store = new ChatRowStore(new LibraryStore())
      const done = chat("c1", { status: "done", finishedAt: 1_000 })

      expect(store.statusOf(done)).toBe("done")
      store.setNow(1_000 + DONE_WINDOW_MS)

      expect(store.statusOf(done)).toBe("idle")
    })
  })

  describe("isActive", () => {
    it("can tell the open chat apart from the others", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c1" })
      const store = new ChatRowStore(libraryStore)

      expect(store.isActive(chat("c1"))).toBe(true)
      expect(store.isActive(chat("c2"))).toBe(false)
    })
  })
})
