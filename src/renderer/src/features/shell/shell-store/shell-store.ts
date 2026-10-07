import { makeAutoObservable } from "mobx"

// The last failure from a header action (opening a project, choosing a folder). The shell shows it under the header.
export class ShellStore {
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setError(message: string | null) {
    this.error = message
  }
}
