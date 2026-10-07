import { describe, expect, it } from "vitest"
import { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"

describe("PromptHistoryStore", () => {
  describe("searching", () => {
    it("can be false while the search is closed", () => {
      expect(new PromptHistoryStore().searching).toBe(false)
    })

    it("can be true while the search is open, even with an empty query", () => {
      const store = new PromptHistoryStore()
      store.setQuery("")

      expect(store.searching).toBe(true)
    })
  })

  describe("matches", () => {
    it("can be empty while the search is closed", () => {
      const store = new PromptHistoryStore()
      store.replace(["a"])

      expect(store.matches).toEqual([])
    })

    it("can list the newest prompts first when the query is empty", () => {
      const store = new PromptHistoryStore()
      store.replace(["a", "b", "c"])
      store.setQuery("")

      expect(store.matches).toEqual(["c", "b", "a"])
    })

    it("can match part of a prompt regardless of case", () => {
      const store = new PromptHistoryStore()
      store.replace(["Fix the BUG", "add test"])
      store.setQuery("bug")

      expect(store.matches).toEqual(["Fix the BUG"])
    })

    it("can show at most 50 matches", () => {
      const store = new PromptHistoryStore()
      store.replace(Array.from({ length: 60 }, (_, index) => `p${index}`))
      store.setQuery("")

      expect(store.matches).toHaveLength(50)
    })
  })

  describe("menu", () => {
    it("can be null while the search is closed", () => {
      expect(new PromptHistoryStore().menu).toBeNull()
    })

    it("can show the query in the title and a note when nothing matches", () => {
      const store = new PromptHistoryStore()
      store.replace(["a"])
      store.setQuery("zzz")

      expect(store.menu).toEqual({ title: "History search: zzz", empty: "No matching prompts", items: [] })
    })

    it("can list matches with their line breaks flattened", () => {
      const store = new PromptHistoryStore()
      store.replace(["fix\n  the bug"])
      store.setQuery("")

      expect(store.menu?.items).toEqual([{ key: "0:fix\n  the bug", label: "fix the bug", detail: "" }])
    })
  })

  describe("remember", () => {
    it("can keep the trimmed text as the newest prompt", () => {
      const store = new PromptHistoryStore()

      expect(store.remember("  hi  ")).toBe(true)
      expect(store.items).toEqual(["hi"])
    })

    it("can ignore blank text", () => {
      const store = new PromptHistoryStore()

      expect(store.remember("   ")).toBe(false)
      expect(store.items).toEqual([])
    })

    it("can move a repeated prompt to the end", () => {
      const store = new PromptHistoryStore()
      store.remember("a")
      store.remember("b")
      store.remember("a")

      expect(store.items).toEqual(["b", "a"])
    })

    it("can keep only the newest 200 prompts", () => {
      const store = new PromptHistoryStore()
      for (let index = 0; index < 205; index += 1) {
        store.remember(`p${index}`)
      }

      expect(store.items).toHaveLength(200)
      expect(store.items[0]).toBe("p5")
    })
  })

  describe("toggleSearch", () => {
    it("can open the search with the current text as its query", () => {
      const store = new PromptHistoryStore()
      store.toggleSearch("draft")

      expect(store.query).toBe("draft")
    })

    it("can close the search when it is already open", () => {
      const store = new PromptHistoryStore()
      store.toggleSearch("draft")
      store.toggleSearch("draft")

      expect(store.query).toBeNull()
    })
  })

  describe("setQuery", () => {
    it("can start the selection over at the first row", () => {
      const store = new PromptHistoryStore()
      store.setActive(3)
      store.setQuery("a")

      expect(store.active).toBe(0)
    })
  })

  describe("reset", () => {
    it("can close the search and drop the recall position", () => {
      const store = new PromptHistoryStore()
      store.setQuery("q")
      store.setIndex(2)
      store.reset()

      expect([store.query, store.index]).toEqual([null, null])
    })
  })

  describe("resetForChat", () => {
    it("can drop the unsent text kept for recall", () => {
      const store = new PromptHistoryStore()
      store.setDraft("unsent")
      store.resetForChat()

      expect(store.draft).toBe("")
    })
  })
})
