import { makeAutoObservable } from "mobx"

// The last failure from opening a project or choosing a folder. The main column shows it.
export class ProjectMenuStore {
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setError(message: string | null) {
    this.error = message
  }
}
