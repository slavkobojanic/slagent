import { describe, expect, it } from "vitest"
import type { DiffComment, ReplyComment } from "@shared/types"
import { PendingCommentsStore } from "@/features/composer/pending-comments/pending-comments-store/pending-comments-store"
import { ReviewStore } from "@/state/review/review-store/review-store"

function diff(id: string, path = "a.ts", line = 1): DiffComment {
  return { id, path, line, side: "new", code: "", text: "rename" }
}

function reply(id: string, quote = "q"): ReplyComment {
  return { id, messageId: "m1", block: "", quote, text: "why" }
}

function setup(diffs: DiffComment[], replies: ReplyComment[]) {
  const reviewStore = new ReviewStore()
  reviewStore.setDiffComments(diffs)
  reviewStore.setReplyComments(replies)
  return new PendingCommentsStore(reviewStore)
}

describe("PendingCommentsStore", () => {
  describe("label", () => {
    it("can be empty when nothing is pending", () => {
      expect(setup([], []).label).toBe("")
    })

    it("can name a single diff comment", () => {
      expect(setup([diff("d1")], []).label).toBe("1 diff comment")
    })

    it("can count reply comments in the plural", () => {
      expect(setup([], [reply("r1"), reply("r2")]).label).toBe("2 reply comments")
    })

    it("can join replies and diff comments with and, replies first", () => {
      expect(setup([diff("d1"), diff("d2"), diff("d3")], [reply("r1")]).label).toBe("1 reply comment and 3 diff comments")
    })
  })

  describe("replies", () => {
    it("can flatten the whitespace in each quote", () => {
      expect(setup([], [reply("r1", "a  b\n c")]).replies).toEqual([{ id: "r1", quote: "a b c", text: "why" }])
    })
  })

  describe("diffs", () => {
    it("can locate each comment by file name and line", () => {
      expect(setup([diff("d1", "src/app/main.ts", 12)], []).diffs).toEqual([{ id: "d1", location: "main.ts:12", text: "rename" }])
    })
  })
})
