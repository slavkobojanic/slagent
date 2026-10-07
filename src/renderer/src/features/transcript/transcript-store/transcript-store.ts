import { makeAutoObservable } from "mobx"

export class TranscriptStore {
  // A search result's message to scroll to once its chat has loaded.
  jumpTo: string | null = null
  atBottom = true

  constructor() {
    makeAutoObservable(this)
  }

  setJumpTo(messageId: string | null) {
    this.jumpTo = messageId
  }

  setAtBottom(value: boolean) {
    this.atBottom = value
  }
}
