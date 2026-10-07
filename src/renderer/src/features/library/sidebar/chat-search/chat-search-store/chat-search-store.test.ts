import { describe, expect, it } from "vitest"
import type { ChatSearchResult } from "@shared/types"
import { ChatSearchStore } from "@/features/library/sidebar/chat-search/chat-search-store/chat-search-store"

const result: ChatSearchResult = {
  projectId: "p1",
  projectName: "Atlas",
  chatId: "c1",
  title: "Plan",
  snippet: "",
  messageId: null,
  updatedAt: 1,
}

describe("ChatSearchStore", () => {
  describe("setResults", () => {
    it("can start with no results, which means the query is blank", () => {
      expect(new ChatSearchStore().results).toBeNull()
    })

    it("can hold the matches for the query", () => {
      const store = new ChatSearchStore()

      store.setResults([result])

      expect(store.results).toEqual([result])
    })
  })

  describe("searching", () => {
    it("can be false while there are no results", () => {
      expect(new ChatSearchStore().searching).toBe(false)
    })

    it("can be true once results arrive, even when none matched", () => {
      const store = new ChatSearchStore()

      store.setResults([])

      expect(store.searching).toBe(true)
    })
  })

  describe("setQuery", () => {
    it("can hold the text typed in the search box", () => {
      const store = new ChatSearchStore()

      store.setQuery("pla")

      expect(store.query).toBe("pla")
    })
  })
})
