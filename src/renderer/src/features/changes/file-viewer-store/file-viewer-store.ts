import { makeAutoObservable } from "mobx"

// Whether Pierre's syntax highlighter has loaded. The file viewer mounts Pierre only after it has.
export class FileViewerStore {
  highlighterReady = false

  constructor() {
    makeAutoObservable(this)
  }

  setHighlighterReady(value: boolean) {
    this.highlighterReady = value
  }
}
