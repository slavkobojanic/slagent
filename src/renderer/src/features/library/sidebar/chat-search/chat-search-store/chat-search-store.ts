import { makeAutoObservable } from "mobx"
import type { ChatSearchResult } from "@shared/types"

export class ChatSearchStore {
  query = ""
  // Null while the query is blank. Otherwise the last matches, which stay until new ones arrive.
  results: ChatSearchResult[] | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get searching(): boolean {
    return this.results !== null
  }

  setQuery(value: string) {
    this.query = value
  }

  setResults(value: ChatSearchResult[] | null) {
    this.results = value
  }
}
