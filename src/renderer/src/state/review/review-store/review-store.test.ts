import { autorun } from "mobx"
import { describe, expect, it } from "vitest"
import type { DiffComment, ReplyComment } from "@shared/types"
import { ReviewStore } from "@/state/review/review-store/review-store"

const diffComment: DiffComment = { id: "d1", path: "src/app.ts", line: 4, side: "new", code: "const a = 1", text: "rename" }
const replyComment: ReplyComment = { id: "r1", messageId: "m1", block: "Use a map.", quote: "a map", text: "why" }

describe("ReviewStore", () => {
  describe("setDiffComments", () => {
    it("can replace the pending diff comments", () => {
      const store = new ReviewStore()

      store.setDiffComments([diffComment])

      expect(store.diffComments).toEqual([diffComment])
    })
  })

  describe("setReplyComments", () => {
    it("can replace the pending reply comments", () => {
      const store = new ReviewStore()

      store.setReplyComments([replyComment])

      expect(store.replyComments).toEqual([replyComment])
    })
  })

  describe("repliesFor", () => {
    it("can return the replies on one block of one response", () => {
      const store = new ReviewStore()
      const other: ReplyComment = { ...replyComment, id: "r2", block: "Another block." }
      store.setReplyComments([replyComment, other])

      expect(store.repliesFor("m1", "Use a map.")).toEqual([replyComment])
    })

    it("can return nothing when the block belongs to another response", () => {
      const store = new ReviewStore()
      store.setReplyComments([replyComment])

      expect(store.repliesFor("m2", "Use a map.")).toEqual([])
    })

    it("can notify a reader of the replies when they change", () => {
      const store = new ReviewStore()
      const seen: number[] = []
      const dispose = autorun(() => {
        seen.push(store.repliesFor("m1", "Use a map.").length)
      })

      store.setReplyComments([replyComment])
      dispose()

      expect(seen).toEqual([0, 1])
    })
  })
})
