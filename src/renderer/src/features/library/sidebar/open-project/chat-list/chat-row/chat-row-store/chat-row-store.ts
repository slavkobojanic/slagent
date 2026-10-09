import { makeAutoObservable } from "mobx"
import type { ChatStatus, ChatSummary } from "@shared/types"
import { chatDisplayStatus } from "@/lib/chat-status"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatRowStore {
  // Milliseconds. The presenter moves it so a done chat falls back to idle on time.
  now = 0

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  statusOf(chat: ChatSummary): ChatStatus {
    return chatDisplayStatus(chat, this.now)
  }

  isActive(chat: ChatSummary): boolean {
    return this.libraryStore.openChatId === chat.id
  }

  setNow(value: number) {
    this.now = value
  }
}
