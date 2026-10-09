import type { ChatSummary } from "@shared/types"
import { projectOfChat } from "@/features/library/library-utils"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import type { ChatRowStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-store/chat-row-store"
import { nextDoneExpiry } from "@/lib/chat-status"
import { toastFailure } from "@/features/library/toast-failure"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"

// The clock re-reads a little after a done window closes, so the timer never fires before it.
const CLOCK_SLACK_MS = 50

export class ChatRowPresenter {
  private disposer: (() => void) | null = null
  private clockTimer: number | null = null

  constructor(
    private readonly store: ChatRowStore,
    private readonly libraryStore: LibraryStore,
    private readonly window: Window,
    private readonly chatRowMenuStore: ChatRowMenuStore,
    private readonly chatSwitchPresenter: ChatSwitchPresenter,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = this.log.reaction("library", () => this.libraryStore.library, this.refreshClock)
    this.refreshClock()
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
    this.clearClockTimer()
  }

  // The sidebar can list chats of projects that are not open, so the chat's own project goes along.
  handleOpen = (chat: ChatSummary) => {
    const projectId = projectOfChat(this.libraryStore.library, chat.id)
    this.log.action("open-chat", { chatId: chat.id, projectId, title: chat.title })
    return toastFailure(() => this.chatSwitchPresenter.openChat(chat.id, projectId))
  }

  handleContextMenu = (chat: ChatSummary) => {
    this.log.action("open-chat-menu", { chatId: chat.id })
    this.chatRowMenuStore.setChatId(chat.id)
  }

  private refreshClock = () => {
    const now = Date.now()
    this.store.setNow(now)
    this.clearClockTimer()
    const library = this.libraryStore.library
    const expiry = nextDoneExpiry([...library.chats, ...Object.values(library.chatsByProject).flat()], now)
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
