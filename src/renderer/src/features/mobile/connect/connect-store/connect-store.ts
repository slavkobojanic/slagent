import { makeAutoObservable } from "mobx"
import { parseServerAddress, type ServerAddress } from "@/lib/server-address"

export class ConnectStore {
  text = ""
  busy = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get address(): ServerAddress | null {
    return parseServerAddress(this.text)
  }

  get canConnect(): boolean {
    if (this.busy || this.text.trim() === "") {
      return false
    }
    return true
  }

  setText(value: string) {
    this.text = value
    this.error = null
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.error = message
  }
}
