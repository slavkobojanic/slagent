import { makeAutoObservable } from "mobx"
import type { ChatSummary } from "@shared/types"
import { orderedChats } from "@/features/library/library-utils"
import { canShowLess, visibleChats } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatListStore {
  showAll = false
  reduceMotion = false

  // An undefined projectId reads the open project's chats; otherwise the project's own.
  constructor(
    private readonly libraryStore: LibraryStore,
    readonly projectId?: string,
  ) {
    makeAutoObservable(this)
  }

  get chats(): ChatSummary[] {
    if (this.projectId === undefined) {
      return orderedChats(this.libraryStore.library.chats)
    }
    return orderedChats(this.libraryStore.library.chatsByProject[this.projectId] ?? [])
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
