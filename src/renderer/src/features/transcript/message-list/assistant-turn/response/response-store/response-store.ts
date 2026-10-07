import { makeAutoObservable } from "mobx"

// How many blocks of each streamed response are on screen. A response without an entry renders whole.
export class ResponseStore {
  shown = new Map<string, number>()

  constructor() {
    makeAutoObservable(this)
  }

  shownOf(messageId: string): number | undefined {
    return this.shown.get(messageId)
  }

  setShown(messageId: string, count: number) {
    this.shown.set(messageId, count)
  }

  clear() {
    this.shown.clear()
  }
}
