import { makeAutoObservable } from "mobx"
import type { Place } from "@/features/library/library-utils"

export const NAV_HISTORY_LIMIT = 100

export class NavHistoryStore {
  entries: Place[] = []
  index = -1
  // The place a back or forward step is opening. Its library event is not a new visit.
  pending: Place | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get current(): Place | null {
    if (this.index < 0 || this.index >= this.entries.length) {
      return null
    }
    return this.entries[this.index]
  }

  // A new visit drops anything ahead of the index, as a browser does.
  record(place: Place) {
    this.entries = [...this.entries.slice(0, this.index + 1), place].slice(-NAV_HISTORY_LIMIT)
    this.index = this.entries.length - 1
  }

  replaceCurrent(place: Place) {
    if (this.current === null) {
      return
    }
    const next = [...this.entries]
    next[this.index] = place
    this.entries = next
  }

  moveTo(index: number) {
    this.index = index
  }

  removeAt(position: number) {
    this.entries = this.entries.filter((_entry, entryIndex) => entryIndex !== position)
    if (position < this.index) {
      this.index -= 1
    }
  }

  setPending(place: Place | null) {
    this.pending = place
  }
}
