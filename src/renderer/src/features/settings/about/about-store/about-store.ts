import { makeAutoObservable } from "mobx"
import type { UpdateCheckResult } from "@shared/types"

// The app version plus what an explicit update check turned up.
export class AboutStore {
  version: string | null = null
  checking = false
  result: UpdateCheckResult | null = null
  readyVersion: string | null = null
  installing = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get canInstall(): boolean {
    return this.readyVersion !== null && !this.installing
  }

  setVersion(version: string | null) {
    this.version = version
  }

  setChecking(value: boolean) {
    this.checking = value
  }

  setResult(result: UpdateCheckResult | null) {
    this.result = result
  }

  setReadyVersion(version: string | null) {
    this.readyVersion = version
  }

  setInstalling(value: boolean) {
    this.installing = value
  }

  setError(message: string | null) {
    this.error = message
  }
}