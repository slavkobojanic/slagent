import { makeAutoObservable } from "mobx"

export class UserTurnStore {
  // The user message being edited, and its draft. The draft starts as the message text.
  editingId: string | null = null
  editDraft = ""
  editSaving = false
  // The user message whose "Edit earlier message?" confirmation is open.
  confirmEditId: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get canSaveEdit(): boolean {
    if (this.editSaving || this.editDraft.trim().length === 0) {
      return false
    }
    return true
  }

  startEdit(messageId: string, text: string) {
    this.editingId = messageId
    this.editDraft = text
    this.editSaving = false
    this.confirmEditId = null
  }

  stopEdit() {
    this.editingId = null
    this.editDraft = ""
    this.editSaving = false
  }

  setEditDraft(value: string) {
    this.editDraft = value
  }

  setEditSaving(value: boolean) {
    this.editSaving = value
  }

  setConfirmEditId(messageId: string | null) {
    this.confirmEditId = messageId
  }
}
