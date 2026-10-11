import { makeAutoObservable } from "mobx"

export class EditorSettingsStore {
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setError(error: string | null) {
    this.error = error
  }
}
