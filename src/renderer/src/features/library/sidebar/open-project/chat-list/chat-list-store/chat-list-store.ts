import { makeAutoObservable } from "mobx"
import type { ChatSummary } from "@shared/types"
import { orderedChats } from "@/features/library/library-utils"
import { canShowLess, visibleChats } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatListStore {
  showAll = false
  reduceMotion = false

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  get chats(): ChatSummary[] {
    return orderedChats(this.libraryStore.library.chats)
  }

  get visible(): ChatSummary[] {
    return visibleChats(this.chats, this.showAll)
  }

  get empty(): boolean {
    return this.chats.length === 0
  }

  get hiddenCount(): number {
    return this.chats.length - this.visible.length
  }

  get canShowLess(): boolean {
    return canShowLess(this.chats.length, this.showAll)
  }

  chatAt(position: number): ChatSummary | undefined {
    return this.chats[position - 1]
  }

  setShowAll(value: boolean) {
    this.showAll = value
  }

  setReduceMotion(value: boolean) {
    this.reduceMotion = value
  }
}
