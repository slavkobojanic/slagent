import { makeAutoObservable } from "mobx"

// How many blocks of each streamed response are on screen. A response has an entry once it has
// streamed in this transcript. A response without one renders whole.
export class RevealStore {
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
