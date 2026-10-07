import { makeAutoObservable } from "mobx"

// Only one row menu is open at a time. A right-click opens it as well as the "..." button.
export class ChatRowMenuStore {
  chatId: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  isOpen(chatId: string): boolean {
    return this.chatId === chatId
  }

  setChatId(chatId: string | null) {
    this.chatId = chatId
  }
}
