import { makeAutoObservable } from "mobx"

// How far the finger has travelled toward committing the back swipe, 0 to 1.
export class BackSwipeStore {
  progress = 0

  constructor() {
    makeAutoObservable(this)
  }

  setProgress(progress: number) {
    this.progress = progress
  }
}
