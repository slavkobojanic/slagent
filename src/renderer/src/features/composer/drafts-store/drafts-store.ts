import { makeAutoObservable, observableRef } from "mobx"

// Past this many drafts, the oldest saved ones are dropped.
const LIMIT = 100

// Unsent prompts keyed by chat. Only the drafts presenter reads and writes storage.
export class DraftsStore {
  drafts: Record<string, string> = {}

  constructor() {
    makeAutoObservable(this, { drafts: observableRef })
  }

  read(key: string): string {
    const draft = this.drafts[key]
    if (typeof draft !== "string") {
      return ""
    }
    return draft
  }

  replace(drafts: Record<string, string>) {
    this.drafts = drafts
  }

  // Returns true when the drafts changed, so the presenter knows to save them.
  write(key: string, text: string): boolean {
    if (text.trim() === "") {
      return this.remove(key)
    }
    const next: Record<string, string> = { ...this.drafts, [key]: text }
    const keys = Object.keys(next)
    for (const stale of keys.slice(0, Math.max(0, keys.length - LIMIT))) {
      delete next[stale]
    }
    this.drafts = next
    return true
  }

  private remove(key: string): boolean {
    if (!Object.hasOwn(this.drafts, key)) {
      return false
    }
    const next = { ...this.drafts }
    delete next[key]
    this.drafts = next
    return true
  }
}
