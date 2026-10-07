import { reaction } from "mobx"
import type { LibraryState } from "@shared/types"
import { isDraftBecomingChat, libraryContext, samePlace, type LibraryContext } from "@/features/library/library-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"

// The side panel, the open file, and pending review comments belong to the chat they were made in.
// They reset when the user moves to another chat or project. A draft that becomes a chat on its first
// message keeps them, because the same conversation continues.
export class ChatSwitchPresenter {
  private disposer: (() => void) | null = null
  private previous: LibraryContext = { projectId: null, chatId: null, chatIds: new Set() }

  constructor(
    private readonly libraryStore: LibraryStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly reviewPresenter: ReviewPresenter,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = reaction(() => this.libraryStore.library, this.handleLibraryChange)
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
  }

  handleLibraryChange = (library: LibraryState) => {
    const previous = this.previous
    const next = libraryContext(library)
    this.previous = next
    if (samePlace(next, previous)) {
      return
    }
    if (isDraftBecomingChat(previous, next)) {
      return
    }
    this.panelPresenter.reset()
    this.reviewPresenter.reset()
  }
}
