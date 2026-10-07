import { makeAutoObservable } from "mobx"

const LIMIT = 200
const SHOWN = 50

export type PromptHistoryMenu = {
  title: string
  empty: string
  items: Array<{ key: string; label: string; detail: string }>
}

// Sent prompts, oldest first, plus the Ctrl+R search over them and the ArrowUp recall position.
export class PromptHistoryStore {
  items: string[] = []
  query: string | null = null
  active = 0
  index: number | null = null
  // The unsent text from before recall started, so stepping back down returns to it.
  draft = ""

  constructor() {
    makeAutoObservable(this)
  }

  get searching(): boolean {
    if (this.query === null) {
      return false
    }
    return true
  }

  // Newest first. An empty query lists the latest prompts.
  get matches(): string[] {
    if (this.query === null) {
      return []
    }
    const needle = this.query.trim().toLowerCase()
    const newestFirst = [...this.items].reverse()
    if (needle === "") {
      return newestFirst.slice(0, SHOWN)
    }
    return newestFirst.filter((item) => item.toLowerCase().includes(needle)).slice(0, SHOWN)
  }

  get menu(): PromptHistoryMenu | null {
    if (this.query === null) {
      return null
    }
    return {
      title: `History search${this.query ? `: ${this.query}` : ""}`,
      empty: "No matching prompts",
      items: this.matches.map((item, index) => ({ key: `${index}:${item}`, label: item.replace(/\s+/g, " "), detail: "" })),
    }
  }

  replace(items: string[]) {
    this.items = items
  }

  // Returns true when the list changed. An earlier copy of the prompt moves to the end.
  remember(text: string): boolean {
    const trimmed = text.trim()
    if (trimmed === "") {
      return false
    }
    const next = this.items.filter((item) => item !== trimmed)
    next.push(trimmed)
    this.items = next.slice(-LIMIT)
    return true
  }

  toggleSearch(text: string) {
    this.query = this.query === null ? text : null
    this.active = 0
  }

  setQuery(query: string | null) {
    this.query = query
    this.active = 0
  }

  setActive(index: number) {
    this.active = index
  }

  setIndex(index: number | null) {
    this.index = index
  }

  setDraft(text: string) {
    this.draft = text
  }

  reset() {
    this.index = null
    this.query = null
  }

  resetForChat() {
    this.reset()
    this.active = 0
    this.draft = ""
  }
}
