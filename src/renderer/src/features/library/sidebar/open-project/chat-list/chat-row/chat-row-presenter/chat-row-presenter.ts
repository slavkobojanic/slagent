import { reaction } from "mobx"
import type { ChatSummary } from "@shared/types"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import type { ChatRowStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-store/chat-row-store"
import { nextDoneExpiry } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-utils"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { LibraryStore } from "@/mirror/library-store/library-store"

// The clock re-reads a little after a done window closes, so the timer never fires before it.
const CLOCK_SLACK_MS = 50

export class ChatRowPresenter {
  private disposer: (() => void) | null = null
  private clockTimer: number | null = null

  constructor(
    private readonly store: ChatRowStore,
    private readonly libraryStore: LibraryStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly chatRowMenuStore: ChatRowMenuStore,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = reaction(() => this.libraryStore.library, this.refreshClock)
    this.refreshClock()
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
    this.clearClockTimer()
  }

  handleOpen = (chat: ChatSummary) => toastFailure(() => this.api.openChat(chat.id))

  handleContextMenu = (chat: ChatSummary) => {
    this.chatRowMenuStore.setChatId(chat.id)
  }

  private refreshClock = () => {
    const now = Date.now()
    this.store.setNow(now)
    this.clearClockTimer()
    const expiry = nextDoneExpiry(this.libraryStore.library.chats, now)
    if (expiry === null) {
      return
    }
    this.clockTimer = this.window.setTimeout(this.refreshClock, expiry - now + CLOCK_SLACK_MS)
  }

  private clearClockTimer = () => {
    if (this.clockTimer === null) {
      return
    }
    this.window.clearTimeout(this.clockTimer)
    this.clockTimer = null
  }
}
