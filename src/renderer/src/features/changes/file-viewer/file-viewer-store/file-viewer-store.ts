import { makeAutoObservable } from "mobx"

export class FileViewerStore {
  highlighterReady = false

  constructor() {
    makeAutoObservable(this)
  }

  setHighlighterReady(value: boolean) {
    this.highlighterReady = value
  }
}
