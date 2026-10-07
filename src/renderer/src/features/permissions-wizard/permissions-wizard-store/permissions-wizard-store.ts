import { makeAutoObservable } from "mobx"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

// macOS 26 renamed both panes. Older systems keep the names they have always had.
const RENAMED_FROM_MAJOR = 26

export class PermissionsWizardStore {
  busy = false
  requestError: string | null = null

  constructor(
    private readonly permissionsStore: PermissionsStore,
    private readonly systemVersion: string,
  ) {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.permissionsStore.locked
  }

  get step(): "accessibility" | "screen" {
    if (this.permissionsStore.permissions?.accessibility === true) {
      return "screen"
    }
    return "accessibility"
  }

  get accessibilityPane(): string {
    if (this.renamed) {
      return "Device Control and Data Access"
    }
    return "Accessibility"
  }

  get screenPane(): string {
    if (this.renamed) {
      return "Screen & System Audio Recording"
    }
    return "Screen Recording"
  }

  // The request needs the permissions to be known first, so the first read has to finish.
  get canAllowAccessibility(): boolean {
    if (this.busy || this.permissionsStore.permissions === null) {
      return false
    }
    return true
  }

  get canAllowScreenRecording(): boolean {
    if (this.busy) {
      return false
    }
    return true
  }

  // A failed request is shown before the permission check's own error.
  get error(): string | null {
    if (this.requestError !== null) {
      return this.requestError
    }
    return this.permissionsStore.permissions?.error ?? null
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.requestError = message
  }

  private get renamed(): boolean {
    return Number(this.systemVersion.split(".")[0]) >= RENAMED_FROM_MAJOR
  }
}
