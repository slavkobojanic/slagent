import { makeAutoObservable } from "mobx"
import type { ChatSummary } from "@shared/types"

export class ChatDeletionStore {
  target: ChatSummary | null = null
  // The chat's project, so a chat of a project that is not open can be deleted too.
  projectId: string | undefined = undefined
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

  setTarget(chat: ChatSummary | null, projectId?: string) {
    this.target = chat
    this.projectId = projectId
  }

  setBusy(value: boolean) {
    this.busy = value
  }
}
