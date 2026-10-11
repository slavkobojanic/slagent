import { makeAutoObservable } from "mobx"
import type { EditorExtensionResult } from "@shared/editor"

export class ExtensionSettingsStore {
  query = ""
  results: EditorExtensionResult[] = []
  searching = false
  searched = false
  // Extensions being installed or removed right now.
  busy: string[] = []
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get canSearch(): boolean {
    if (this.searching || this.query.trim().length === 0) {
      return false
    }
    return true
  }

  setQuery(query: string) {
    this.query = query
  }

  setSearching(searching: boolean) {
    this.searching = searching
  }

  setResults(results: EditorExtensionResult[]) {
    this.results = results
    this.searched = true
  }

  setError(error: string | null) {
    this.error = error
  }

  startBusy(id: string) {
    if (!this.busy.includes(id)) {
      this.busy.push(id)
    }
  }

  endBusy(id: string) {
    this.busy = this.busy.filter((existing) => existing !== id)
  }
}
