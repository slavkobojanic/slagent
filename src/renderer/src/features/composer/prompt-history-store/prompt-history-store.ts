import { makeAutoObservable, observableRef } from "mobx"

// Past this many prompts, the oldest are dropped.
const LIMIT = 200
// The history search shows at most this many matches.
const SHOWN = 50

// Prompts the user has sent, oldest first. Only the history presenter reads and writes storage.
export class PromptHistoryStore {
  items: string[] = []

  constructor() {
    makeAutoObservable(this, { items: observableRef })
  }

  replace(items: string[]) {
    this.items = items
  }

  // Returns true when the list changed. The text is trimmed, and an earlier copy moves to the end.
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

  // Newest first. An empty query lists the latest prompts.
  search(query: string): string[] {
    const needle = query.trim().toLowerCase()
    const newestFirst = [...this.items].reverse()
    if (needle === "") {
      return newestFirst.slice(0, SHOWN)
    }
    return newestFirst.filter((item) => item.toLowerCase().includes(needle)).slice(0, SHOWN)
  }
}
