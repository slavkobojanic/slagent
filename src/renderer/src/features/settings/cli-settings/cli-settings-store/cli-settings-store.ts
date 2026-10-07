import { makeAutoObservable, observableRef } from "mobx"
import type { CliStatus } from "@shared/types"

export type CliAction = "install" | "uninstall"

// The `slagent` command section. Only one install or uninstall runs at a time.
export class CliSettingsStore {
  status: CliStatus | null = null
  busy: CliAction | null = null
  error: string | null = null

  constructor() {
    makeAutoObservable(this, { status: observableRef })
  }

  // The command is ours when it is installed, or installed by an older build of slagent.
  get ownsCommand(): boolean {
    if (this.status === null) {
      return false
    }
    if (this.status.state !== "installed" && this.status.state !== "outdated") {
      return false
    }
    return true
  }

  get installing(): boolean {
    return this.busy === "install"
  }

  get uninstalling(): boolean {
    return this.busy === "uninstall"
  }

  get canInstall(): boolean {
    if (this.busy !== null || this.status === null) {
      return false
    }
    if (this.status.state === "conflict" || this.status.state === "unsupported") {
      return false
    }
    return true
  }

  get canUninstall(): boolean {
    if (this.busy !== null || !this.ownsCommand) {
      return false
    }
    return true
  }

  setStatus(status: CliStatus | null) {
    this.status = status
  }

  setBusy(action: CliAction | null) {
    this.busy = action
  }

  setError(message: string | null) {
    this.error = message
  }

  // Starts a visit with no status, as the legacy section did when it mounted.
  reset() {
    this.status = null
    this.error = null
  }
}
