import { makeAutoObservable } from "mobx"
import type { CliStatus } from "@shared/types"

export type CliAction = "install" | "uninstall"

export class CliSettingsStore {
  status: CliStatus | null = null
  busy: CliAction | null = null
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  // An outdated command was installed by an older build of slagent, so it is still ours.
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

  get showInstall(): boolean {
    if (this.status?.state === "installed" || this.status?.state === "unsupported") {
      return false
    }
    return true
  }

  get installLabel(): string {
    if (this.installing) {
      return "Installing"
    }
    if (this.status?.state === "outdated") {
      return "Update command"
    }
    return "Install command"
  }

  get uninstallLabel(): string {
    if (this.uninstalling) {
      return "Removing"
    }
    return "Uninstall"
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

  reset() {
    this.status = null
    this.error = null
  }
}
