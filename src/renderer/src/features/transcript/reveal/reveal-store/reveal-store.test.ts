import { describe, expect, it } from "vitest"
import { RevealStore } from "@/features/transcript/reveal/reveal-store/reveal-store"

describe("RevealStore", () => {
  describe("shownOf", () => {
    it("can report nothing for a reply that has not streamed here", () => {
      const store = new RevealStore()

      expect(store.shownOf("a1")).toBeUndefined()
    })

    it("can report how many blocks of a reply are on screen", () => {
      const store = new RevealStore()
      store.setShown("a1", 2)

      expect(store.shownOf("a1")).toBe(2)
    })
  })

  describe("setShown", () => {
    it("can move a reply on to more blocks", () => {
      const store = new RevealStore()
      store.setShown("a1", 1)

      store.setShown("a1", 3)

      expect(store.shownOf("a1")).toBe(3)
    })
  })

  describe("clear", () => {
    it("can forget every reply, so the next chat starts with none", () => {
      const store = new RevealStore()
      store.setShown("a1", 1)
      store.setShown("a2", 4)

      store.clear()

      expect(store.shownOf("a1")).toBeUndefined()
      expect(store.shownOf("a2")).toBeUndefined()
    })
  })
})
