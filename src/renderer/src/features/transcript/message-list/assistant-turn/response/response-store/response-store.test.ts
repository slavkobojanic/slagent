import { describe, expect, it } from "vitest"
import { ResponseStore } from "@/features/transcript/message-list/assistant-turn/response/response-store/response-store"

describe("ResponseStore", () => {
  describe("shownOf", () => {
    it("can report nothing for a reply that has not streamed here", () => {
      const store = new ResponseStore()

      expect(store.shownOf("a1")).toBeUndefined()
    })

    it("can report how many blocks of a reply are on screen", () => {
      const store = new ResponseStore()
      store.setShown("a1", 2)

      expect(store.shownOf("a1")).toBe(2)
    })
  })

  describe("setShown", () => {
    it("can move a reply on to more blocks", () => {
      const store = new ResponseStore()
      store.setShown("a1", 1)

      store.setShown("a1", 3)

      expect(store.shownOf("a1")).toBe(3)
    })
  })

  describe("clear", () => {
    it("can forget every reply, so the next chat starts with none", () => {
      const store = new ResponseStore()
      store.setShown("a1", 1)
      store.setShown("a2", 4)

      store.clear()

      expect(store.shownOf("a1")).toBeUndefined()
      expect(store.shownOf("a2")).toBeUndefined()
    })
  })
})
