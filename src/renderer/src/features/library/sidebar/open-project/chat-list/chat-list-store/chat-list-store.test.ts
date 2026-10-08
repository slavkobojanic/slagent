import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { CHAT_LIMIT } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import { ChatListStore } from "@/features/library/sidebar/open-project/chat-list/chat-list-store/chat-list-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function chat(id: string, updatedAt = 0): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt, running: false, status: "idle", finishedAt: null }
}

function storeWith(chats: ChatSummary[]): ChatListStore {
  const libraryStore = new LibraryStore()
  libraryStore.setLibrary({ projects: [], openProjectId: "p1", chats, chatsByProject: {}, openChatId: null })
  return new ChatListStore(libraryStore)
}

const long = Array.from({ length: CHAT_LIMIT + 3 }, (_, index) => chat(`c${index}`))

describe("ChatListStore", () => {
  describe("chats", () => {
    it("can order the library's chats, most recently updated first", () => {
      expect(storeWith([chat("old", 1), chat("new", 9)]).chats.map((item) => item.id)).toEqual(["new", "old"])
    })
  })

  describe("visible and hiddenCount", () => {
    it("can cut a long list to the limit and count the rest", () => {
      const store = storeWith(long)

      expect(store.visible).toHaveLength(CHAT_LIMIT)
      expect(store.hiddenCount).toBe(3)
    })

    it("can show every chat once showing all", () => {
      const store = storeWith(long)

      store.setShowAll(true)

      expect(store.visible).toHaveLength(CHAT_LIMIT + 3)
      expect(store.hiddenCount).toBe(0)
      expect(store.canShowLess).toBe(true)
    })
  })

  describe("empty", () => {
    it("can be true when the project has no chats", () => {
      expect(storeWith([]).empty).toBe(true)
    })
  })

  describe("chatAt", () => {
    it("can find a chat by its one-based position", () => {
      const store = storeWith([chat("old", 1), chat("new", 9)])

      expect(store.chatAt(1)?.id).toBe("new")
      expect(store.chatAt(3)).toBeUndefined()
    })
  })

  describe("setReduceMotion", () => {
    it("can hold the motion preference", () => {
      const store = storeWith([])

      store.setReduceMotion(true)

      expect(store.reduceMotion).toBe(true)
    })
  })
})
