import { makeAutoObservable } from "mobx"

// An update the main process has downloaded and is waiting to install, and how the install is going.
export class UpdateStore {
  version: string | null = null
  installing = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get canInstall(): boolean {
    if (this.version === null || this.installing) {
      return false
    }
    return true
  }

  setVersion(version: string | null) {
    this.version = version
  }

  setInstalling(value: boolean) {
    this.installing = value
  }

  setError(message: string | null) {
    this.error = message
  }
}
