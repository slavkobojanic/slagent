import { makeAutoObservable } from "mobx"

// The server list lives in the shared McpStore so the header badge reads the same list.
export class McpSettingsStore {
  refreshing = false
  busyName: string | null = null
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setRefreshing(value: boolean) {
    this.refreshing = value
  }

  setBusyName(name: string | null) {
    this.busyName = name
  }

  setError(message: string | null) {
    this.error = message
  }
}
