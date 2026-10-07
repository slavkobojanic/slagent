import type { Log } from "@/log/log"
import type { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"

const STORAGE_KEY = "slagent:prompt-history"

export type HistoryKeyEvent = {
  key: string
  shiftKey: boolean
  ctrlKey: boolean
  preventDefault: () => void
}

// The composer owns the text box, so a handled key hands back the prompt to put in it instead of writing it.
export type HistoryKeyResult = { handled: boolean; text: string | null }

const UNHANDLED: HistoryKeyResult = { handled: false, text: null }
const HANDLED: HistoryKeyResult = { handled: true, text: null }

export class PromptHistoryPresenter {
  constructor(
    private readonly store: PromptHistoryStore,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    this.store.replace(this.load())
  }

  remember = (text: string) => {
    if (!this.store.remember(text)) {
      return
    }
    try {
      this.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store.items))
    } catch {
      // History is a convenience, so a full or blocked storage is fine.
    }
  }

  // Returns true when the search is open and took the text as its query.
  search = (query: string): boolean => {
    if (!this.store.searching) {
      return false
    }
    this.store.setQuery(query)
    return true
  }

  hover = (index: number) => {
    this.store.setActive(index)
  }

  // Closes the search and returns the chosen prompt, or null when there is no row at that index.
  choose = (index: number): string | null => {
    const item = this.store.matches[index]
    if (item === undefined) {
      return null
    }
    this.log.action("choose-history", { index })
    this.store.setQuery(null)
    return item
  }

  // Ctrl+R toggles the search; while it is open, it claims the keys that move through and pick from it.
  handleSearchKey = (event: HistoryKeyEvent, text: string): HistoryKeyResult => {
    if (event.ctrlKey && event.key === "r") {
      event.preventDefault()
      this.log.action("toggle-history-search", { open: !this.store.searching })
      this.store.toggleSearch(text)
      return HANDLED
    }
    if (!this.store.searching) {
      return UNHANDLED
    }
    if (event.key === "Escape") {
      event.preventDefault()
      this.log.action("close-history-search")
      this.store.setQuery(null)
      return HANDLED
    }
    const count = this.store.matches.length
    if (count === 0) {
      if (event.key !== "Enter") {
        return UNHANDLED
      }
      event.preventDefault()
      return HANDLED
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      this.store.setActive(Math.min(this.store.active + 1, count - 1))
      return HANDLED
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      this.store.setActive(Math.max(this.store.active - 1, 0))
      return HANDLED
    }
    if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      event.preventDefault()
      return { handled: true, text: this.choose(this.store.active) }
    }
    return UNHANDLED
  }

  // ArrowUp and ArrowDown walk the sent prompts. The first step up keeps the unsent text for the way back down.
  step = (direction: -1 | 1, text: string, caret: number): HistoryKeyResult => {
    const items = this.store.items
    if (this.store.searching || items.length === 0) {
      return UNHANDLED
    }
    const index = this.store.index
    const browsing = index !== null && text === items[index]
    if (direction === -1) {
      if (!browsing && text.slice(0, caret).includes("\n")) {
        return UNHANDLED
      }
      if (!browsing) {
        this.store.setDraft(text)
      }
      const next = browsing && index !== null ? index - 1 : items.length - 1
      if (next < 0) {
        return HANDLED
      }
      this.store.setIndex(next)
      return { handled: true, text: items[next] ?? "" }
    }
    if (!browsing || index === null) {
      return UNHANDLED
    }
    const next = index + 1
    if (next >= items.length) {
      this.store.setIndex(null)
      return { handled: true, text: this.store.draft }
    }
    this.store.setIndex(next)
    return { handled: true, text: items[next] ?? "" }
  }

  reset = () => {
    this.store.reset()
  }

  resetForChat = () => {
    this.store.resetForChat()
  }

  private load = (): string[] => {
    try {
      const parsed: unknown = JSON.parse(this.window.localStorage.getItem(STORAGE_KEY) ?? "[]")
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed.filter((item): item is string => typeof item === "string")
    } catch {
      return []
    }
  }
}
