import { autorun } from "mobx"
import { describe, expect, it } from "vitest"
import { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"

describe("CommentableResponseStore", () => {
  describe("setDraft", () => {
    it("can open a draft on one unit without touching the others", () => {
      const store = new CommentableResponseStore()

      store.setDraft("m1/0", { quote: "Use a map." })

      expect(store.draftOf("m1/0")).toEqual({ quote: "Use a map." })
      expect(store.draftOf("m1/1")).toBeNull()
    })

    it("can close the draft with null", () => {
      const store = new CommentableResponseStore()
      store.setDraft("m1/0", { quote: "Use a map." })

      store.setDraft("m1/0", null)

      expect(store.draftOf("m1/0")).toBeNull()
    })
  })

  describe("setPending", () => {
    it("can store a pending selection with its position", () => {
      const store = new CommentableResponseStore()

      store.setPending("m1/0", { quote: "a map", at: 4, top: 10, left: 20 })

      expect(store.pendingOf("m1/0")).toEqual({ quote: "a map", at: 4, top: 10, left: 20 })
    })
  })

  describe("setCard and setCardOpen", () => {
    it("can show a card and track whether the whole-block card is open", () => {
      const store = new CommentableResponseStore()

      store.setCard("m1/0", { commentId: "e1", top: 5, left: 9 })
      store.setCardOpen("m1/0", true)

      expect(store.cardOf("m1/0")).toEqual({ commentId: "e1", top: 5, left: 9 })
      expect(store.isCardOpen("m1/0")).toBe(true)
    })

    it("can clear the card without closing the whole-block card", () => {
      const store = new CommentableResponseStore()
      store.setCard("m1/0", { commentId: "e1", top: 5, left: 9 })
      store.setCardOpen("m1/0", true)

      store.setCard("m1/0", null)

      expect(store.cardOf("m1/0")).toBeNull()
      expect(store.isCardOpen("m1/0")).toBe(true)
    })
  })

  describe("clearPending", () => {
    it("can clear the pending selection on every unit and keep the drafts", () => {
      const store = new CommentableResponseStore()
      store.setPending("m1/0", { quote: "a map", at: 4, top: 10, left: 20 })
      store.setPending("m1/1", { quote: "a set", at: 0, top: 1, left: 2 })
      store.setDraft("m1/1", { quote: "a set" })

      store.clearPending()

      expect(store.pendingOf("m1/0")).toBeNull()
      expect(store.pendingOf("m1/1")).toBeNull()
      expect(store.draftOf("m1/1")).toEqual({ quote: "a set" })
    })
  })

  describe("reset", () => {
    it("can forget the state of every unit", () => {
      const store = new CommentableResponseStore()
      store.setDraft("m1/0", { quote: "Use a map." })
      store.setCardOpen("m1/1", true)

      store.reset()

      expect(store.draftOf("m1/0")).toBeNull()
      expect(store.isCardOpen("m1/1")).toBe(false)
    })
  })

  describe("observability", () => {
    it("can notify a reader of a unit's draft when that draft changes", () => {
      const store = new CommentableResponseStore()
      const seen: Array<string | undefined> = []
      const dispose = autorun(() => {
        seen.push(store.draftOf("m1/0")?.quote)
      })

      store.setDraft("m1/0", { quote: "Use a map." })
      dispose()

      expect(seen).toEqual([undefined, "Use a map."])
    })
  })
})
