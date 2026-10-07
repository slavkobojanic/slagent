import { makeAutoObservable } from "mobx"

// The transcript's own UI state: the edit in progress, the earlier-message confirmation, the
// plan approval, the scroll button, and a search result waiting to be shown. The chat's
// messages are not here; they come from the run mirror.
export class TranscriptStore {
  // A search result's message to scroll to once its chat has loaded.
  jumpTo: string | null = null
  // The user message being edited, and its draft. The draft starts as the message text.
  editingId: string | null = null
  editDraft = ""
  editSaving = false
  // The user message whose "Edit earlier message?" confirmation is open.
  confirmEditId: string | null = null
  approving = false
  // Whether the reader is at the bottom of the transcript. The scroll-down button hides then.
  atBottom = true

  constructor() {
    makeAutoObservable(this)
  }

  get canSaveEdit(): boolean {
    if (this.editSaving || this.editDraft.trim().length === 0) {
      return false
    }
    return true
  }

  setJumpTo(messageId: string | null) {
    this.jumpTo = messageId
  }

  // Starts editing a message. A confirmation that was open is closed, and nothing is saving.
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

  setApproving(value: boolean) {
    this.approving = value
  }

  setAtBottom(value: boolean) {
    this.atBottom = value
  }
}
