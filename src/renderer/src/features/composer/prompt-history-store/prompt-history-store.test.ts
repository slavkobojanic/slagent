import { describe, expect, it } from "vitest"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"

describe("PromptHistoryStore", () => {
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

  describe("search", () => {
    it("can list the newest prompts first when the query is empty", () => {
      const store = new PromptHistoryStore()
      store.replace(["a", "b", "c"])

      expect(store.search("")).toEqual(["c", "b", "a"])
    })

    it("can match part of a prompt regardless of case", () => {
      const store = new PromptHistoryStore()
      store.replace(["Fix the BUG", "add test"])

      expect(store.search("bug")).toEqual(["Fix the BUG"])
    })

    it("can show at most 50 matches", () => {
      const store = new PromptHistoryStore()
      store.replace(Array.from({ length: 60 }, (_, index) => `p${index}`))

      expect(store.search("")).toHaveLength(50)
    })
  })
})
