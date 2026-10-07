import { describe, expect, it } from "vitest"
import { UserTurnStore } from "@/features/transcript/message-list/user-turn/user-turn-store/user-turn-store"

describe("UserTurnStore", () => {
  describe("canSaveEdit", () => {
    it("can not save an empty draft", () => {
      const store = new UserTurnStore()
      store.setEditDraft("   ")

      expect(store.canSaveEdit).toBe(false)
    })

    it("can not save while the edit is already being sent", () => {
      const store = new UserTurnStore()
      store.startEdit("u1", "Fix it")
      store.setEditSaving(true)

      expect(store.canSaveEdit).toBe(false)
    })

    it("can save a draft with text that is not being sent", () => {
      const store = new UserTurnStore()
      store.startEdit("u1", "Fix it")

      expect(store.canSaveEdit).toBe(true)
    })
  })

  describe("startEdit", () => {
    it("can start editing with the message text as the draft", () => {
      const store = new UserTurnStore()

      store.startEdit("u1", "Fix it")

      expect(store.editingId).toBe("u1")
      expect(store.editDraft).toBe("Fix it")
    })

    it("can close a confirmation that was open", () => {
      const store = new UserTurnStore()
      store.setConfirmEditId("u1")

      store.startEdit("u1", "Fix it")

      expect(store.confirmEditId).toBeNull()
    })

    it("can clear a saving flag left by an earlier edit", () => {
      const store = new UserTurnStore()
      store.setEditSaving(true)

      store.startEdit("u2", "Other")

      expect(store.editSaving).toBe(false)
    })
  })

  describe("stopEdit", () => {
    it("can end the edit and drop its draft", () => {
      const store = new UserTurnStore()
      store.startEdit("u1", "Fix it")
      store.setEditSaving(true)

      store.stopEdit()

      expect(store.editingId).toBeNull()
      expect(store.editDraft).toBe("")
      expect(store.editSaving).toBe(false)
    })
  })
})
