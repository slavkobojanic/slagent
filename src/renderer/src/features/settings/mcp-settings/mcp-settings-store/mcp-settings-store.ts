import { makeAutoObservable } from "mobx"

// Request state for the MCP section. The server list itself lives in the shared McpStore.
export class McpSettingsStore {
  refreshing = false
  // The server whose sign-in, sign-out or enable change is running.
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
