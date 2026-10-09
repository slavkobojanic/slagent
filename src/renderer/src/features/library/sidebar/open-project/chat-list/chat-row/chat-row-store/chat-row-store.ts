import { makeAutoObservable } from "mobx"
import type { ChatStatus, ChatSummary } from "@shared/types"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatRowStore {
  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  statusOf(chat: ChatSummary): ChatStatus {
    return chat.status
  }

  isActive(chat: ChatSummary): boolean {
    return this.libraryStore.openChatId === chat.id
  }
}
