import { makeAutoObservable } from "mobx"
import type { ChatSummary } from "@shared/types"

export class ChatDeletionStore {
  target: ChatSummary | null = null
  busy = false

  constructor() {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.target !== null
  }

  get canConfirm(): boolean {
    if (this.busy || this.target === null) {
      return false
    }
    return true
  }

  setTarget(chat: ChatSummary | null) {
    this.target = chat
  }

  setBusy(value: boolean) {
    this.busy = value
  }
}
