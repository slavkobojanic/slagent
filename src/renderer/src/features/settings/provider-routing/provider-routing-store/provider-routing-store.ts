import { makeAutoObservable } from "mobx"

export class ProviderRoutingStore {
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }
}
