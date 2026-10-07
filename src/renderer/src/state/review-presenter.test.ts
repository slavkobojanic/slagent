import { describe, expect, it } from "vitest"
import type { DiffComment, ReplyComment } from "@shared/types"
import { ReviewPresenter } from "@/state/review-presenter"
import { ReviewStore } from "@/state/review-store"

const diffComment: DiffComment = { id: "d1", path: "src/app.ts", line: 4, side: "new", code: "const a = 1", text: "rename" }
const replyComment: ReplyComment = { id: "r1", messageId: "m1", block: "Use a map.", quote: "a map", at: 4, text: "why" }
const otherReply: ReplyComment = { id: "r2", messageId: "m1", block: "Use a map.", quote: "Use a map.", text: "yes" }

function setup() {
  const store = new ReviewStore()
  const presenter = new ReviewPresenter(store)
  return { store, presenter }
}

describe("ReviewPresenter", () => {
  describe("addDiffComment", () => {
    it("can add a diff comment after the pending ones", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)

      presenter.addDiffComment({ ...diffComment, id: "d2" })

      expect(store.diffComments.map((item) => item.id)).toEqual(["d1", "d2"])
    })
  })

  describe("removeDiffComment", () => {
    it("can remove the diff comment with the given id", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)

      presenter.removeDiffComment("d1")

      expect(store.diffComments).toEqual([])
    })
  })

  describe("addReplyComment", () => {
    it("can add a reply comment after the pending ones", () => {
      const { store, presenter } = setup()

      presenter.addReplyComment(replyComment)
      presenter.addReplyComment(otherReply)

      expect(store.replyComments).toEqual([replyComment, otherReply])
    })
  })

  describe("editReplyComment", () => {
    it("can change the words of a pending reply and keep its place in the response", () => {
      const { store, presenter } = setup()
      presenter.addReplyComment(replyComment)

      presenter.editReplyComment("r1", "use a set")

      expect(store.replyComments).toEqual([{ ...replyComment, text: "use a set" }])
    })

    it("can leave the replies alone when no reply has the id", () => {
      const { store, presenter } = setup()
      presenter.addReplyComment(replyComment)

      presenter.editReplyComment("missing", "use a set")

      expect(store.replyComments).toEqual([replyComment])
    })
  })

  describe("removeReplyComment", () => {
    it("can remove the reply comment with the given id", () => {
      const { store, presenter } = setup()
      presenter.addReplyComment(replyComment)
      presenter.addReplyComment(otherReply)

      presenter.removeReplyComment("r1")

      expect(store.replyComments).toEqual([otherReply])
    })
  })

  describe("reset", () => {
    it("can clear the diff and reply comments", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)
      presenter.addReplyComment(replyComment)

      presenter.reset()

      expect(store.diffComments).toEqual([])
      expect(store.replyComments).toEqual([])
    })
  })

  describe("takeForSubmit", () => {
    it("can return both lists and clear them from the drafts", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)
      presenter.addReplyComment(replyComment)

      const snapshot = presenter.takeForSubmit()

      expect(snapshot).toEqual({ diffComments: [diffComment], replyComments: [replyComment] })
      expect(store.diffComments).toEqual([])
      expect(store.replyComments).toEqual([])
    })
  })

  describe("restore", () => {
    it("can put a taken snapshot back into the drafts", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)
      presenter.addReplyComment(replyComment)
      const snapshot = presenter.takeForSubmit()

      presenter.restore(snapshot)

      expect(store.diffComments).toEqual([diffComment])
      expect(store.replyComments).toEqual([replyComment])
    })

    it("can keep the replies written while the send was in flight, with the restored ones ahead of them", () => {
      const { store, presenter } = setup()
      presenter.addReplyComment(replyComment)
      const snapshot = presenter.takeForSubmit()
      presenter.addReplyComment(otherReply)

      presenter.restore(snapshot)

      expect(store.replyComments).toEqual([replyComment, otherReply])
    })

    it("can keep the diff comments written while the send was in flight, with the restored ones ahead of them", () => {
      const { store, presenter } = setup()
      presenter.addDiffComment(diffComment)
      const snapshot = presenter.takeForSubmit()
      const written: DiffComment = { ...diffComment, id: "d2", text: "later" }
      presenter.addDiffComment(written)

      presenter.restore(snapshot)

      expect(store.diffComments).toEqual([diffComment, written])
    })

    it("can keep the draft's copy of a comment that is already in the drafts, without adding it twice", () => {
      const { store, presenter } = setup()
      presenter.addReplyComment(replyComment)
      const snapshot = presenter.takeForSubmit()
      presenter.addReplyComment({ ...replyComment, text: "edited" })

      presenter.restore(snapshot)

      expect(store.replyComments).toEqual([{ ...replyComment, text: "edited" }])
    })

    it("can add a comment once when the snapshot repeats its id", () => {
      const { store, presenter } = setup()

      presenter.restore({ diffComments: [diffComment, diffComment], replyComments: [replyComment, replyComment] })

      expect(store.diffComments).toEqual([diffComment])
      expect(store.replyComments).toEqual([replyComment])
    })
  })
})
