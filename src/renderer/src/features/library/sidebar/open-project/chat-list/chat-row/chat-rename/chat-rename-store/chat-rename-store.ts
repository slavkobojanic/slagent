import { makeAutoObservable } from "mobx"

export class ChatRenameStore {
  renamingId: string | null = null
  draft = ""

  constructor() {
    makeAutoObservable(this)
  }

  isRenaming(chatId: string): boolean {
    return this.renamingId === chatId
  }

  startRename(chatId: string, title: string) {
    this.renamingId = chatId
    this.draft = title
  }

  setDraft(value: string) {
    this.draft = value
  }

  endRename() {
    this.renamingId = null
  }
}
