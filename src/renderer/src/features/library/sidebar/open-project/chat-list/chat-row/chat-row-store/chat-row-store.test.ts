import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRowStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-store/chat-row-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

describe("ChatRowStore", () => {
  describe("statusOf", () => {
    it("can show the chat's own status", () => {
      const store = new ChatRowStore(new LibraryStore())

      expect(store.statusOf(chat("c1", { status: "done" }))).toBe("done")
      expect(store.statusOf(chat("c1", { status: "idle" }))).toBe("idle")
    })
  })

  describe("isActive", () => {
    it("can tell the open chat apart from the others", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c1", tasks: [] })
      const store = new ChatRowStore(libraryStore)

      expect(store.isActive(chat("c1"))).toBe(true)
      expect(store.isActive(chat("c2"))).toBe(false)
    })
  })
})
