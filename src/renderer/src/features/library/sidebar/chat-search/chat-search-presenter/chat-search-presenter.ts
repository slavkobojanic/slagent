import type { ChatSearchResult } from "@shared/types"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatSearchStore } from "@/features/library/sidebar/chat-search/chat-search-store/chat-search-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { JumpPort } from "@/state/jump-port/jump-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"

const SEARCH_DELAY_MS = 150
export const SEARCH_INPUT_ID = "chat-search"

export class ChatSearchPresenter {
  private disposer: (() => void) | null = null
  private searchTimer: number | null = null
  // Bumped on every query change, so a search still in flight for an older query is dropped.
  private searchToken = 0

  constructor(
    private readonly store: ChatSearchStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly jumpPort: JumpPort,
    private readonly layoutPresenter: LayoutPresenter,
    private readonly commandRegistry: CommandRegistry,
    private readonly chatSwitchPresenter: ChatSwitchPresenter,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = this.commandRegistry.register({
      id: "search.open",
      label: "Search chats",
      group: "Actions",
      shortcut: { key: "f", mod: true, shift: true },
      run: this.focusSearch,
    })
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
    this.searchToken += 1
    this.clearSearchTimer()
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
    this.searchFor(value)
  }

  handleKeyDown = (key: string) => {
    if (key === "Escape") {
      this.handleClear()
      return
    }
    const first = this.store.results?.[0]
    if (key !== "Enter" || first === undefined) {
      return
    }
    this.handleOpen(first)
  }

  handleClear = () => {
    this.log.action("clear-search")
    this.handleQueryChange("")
  }

  handleOpen = (result: ChatSearchResult) => {
    this.log.action("open-search-result", { chatId: result.chatId, projectId: result.projectId, messageId: result.messageId })
    this.handleQueryChange("")
    void this.openHit(result)
  }

  // A title-only hit, or a chat that failed to open, has nothing to jump to.
  private openHit = async (result: ChatSearchResult) => {
    const opened = await toastFailure(() => this.chatSwitchPresenter.openChat(result.chatId, result.projectId, result.messageId ?? undefined))
    if (!opened || result.messageId === null) {
      return
    }
    this.jumpPort.request(result.messageId)
  }

  // The caret goes in once the pane has its width.
  private focusSearch = () => {
    this.log.action("focus-search")
    this.layoutPresenter.setSidebarOpen(true)
    this.window.requestAnimationFrame(() => {
      this.window.document.getElementById(SEARCH_INPUT_ID)?.focus()
    })
  }

  // A failed search keeps the current results.
  private searchFor = (query: string) => {
    this.clearSearchTimer()
    this.searchToken += 1
    const token = this.searchToken
    if (query.trim() === "") {
      this.store.setResults(null)
      return
    }
    this.searchTimer = this.window.setTimeout(() => {
      this.searchTimer = null
      void this.api.searchChats(query).then(
        (next) => {
          if (token !== this.searchToken) {
            return
          }
          this.log.debug("search-results", { query, count: next.length })
          this.store.setResults(next)
        },
        (error) => {
          this.log.warn("search-failed", { query, error })
        },
      )
    }, SEARCH_DELAY_MS)
  }

  private clearSearchTimer = () => {
    if (this.searchTimer === null) {
      return
    }
    this.window.clearTimeout(this.searchTimer)
    this.searchTimer = null
  }
}
