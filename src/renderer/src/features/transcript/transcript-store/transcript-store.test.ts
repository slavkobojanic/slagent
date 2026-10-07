import { describe, expect, it } from "vitest"
import { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"

describe("TranscriptStore", () => {
  describe("canSaveEdit", () => {
    it("can not save an empty draft", () => {
      const store = new TranscriptStore()
      store.setEditDraft("   ")

      expect(store.canSaveEdit).toBe(false)
    })

    it("can not save while the edit is already being sent", () => {
      const store = new TranscriptStore()
      store.startEdit("u1", "Fix it")
      store.setEditSaving(true)

      expect(store.canSaveEdit).toBe(false)
    })

    it("can save a draft with text that is not being sent", () => {
      const store = new TranscriptStore()
      store.startEdit("u1", "Fix it")

      expect(store.canSaveEdit).toBe(true)
    })
  })

  describe("startEdit", () => {
    it("can start editing with the message text as the draft", () => {
      const store = new TranscriptStore()

      store.startEdit("u1", "Fix it")

      expect(store.editingId).toBe("u1")
      expect(store.editDraft).toBe("Fix it")
    })

    it("can close a confirmation that was open", () => {
      const store = new TranscriptStore()
      store.setConfirmEditId("u1")

      store.startEdit("u1", "Fix it")

      expect(store.confirmEditId).toBeNull()
    })

    it("can clear a saving flag left by an earlier edit", () => {
      const store = new TranscriptStore()
      store.setEditSaving(true)

      store.startEdit("u2", "Other")

      expect(store.editSaving).toBe(false)
    })
  })

  describe("stopEdit", () => {
    it("can end the edit and drop its draft", () => {
      const store = new TranscriptStore()
      store.startEdit("u1", "Fix it")
      store.setEditSaving(true)

      store.stopEdit()

      expect(store.editingId).toBeNull()
      expect(store.editDraft).toBe("")
      expect(store.editSaving).toBe(false)
    })
  })

  describe("setJumpTo", () => {
    it("can hold a search result's message until it is shown", () => {
      const store = new TranscriptStore()

      store.setJumpTo("m7")

      expect(store.jumpTo).toBe("m7")
    })
  })

  describe("setApproving and setAtBottom", () => {
    it("can track an approval in flight and whether the reader is at the bottom", () => {
      const store = new TranscriptStore()

      store.setApproving(true)
      store.setAtBottom(false)

      expect(store.approving).toBe(true)
      expect(store.atBottom).toBe(false)
    })
  })
})
