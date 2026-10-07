import { makeAutoObservable } from "mobx"
import type { PermissionsStore } from "@/state/permissions-store"

// macOS 26 renamed both panes. Older systems keep the names they have always had.
const RENAMED_FROM_MAJOR = 26

// The wizard's own state: a request in flight and the last failed request. The permissions
// themselves live in the shared store, which decides whether the wizard is open.
export class PermissionsWizardStore {
  busy = false
  requestError: string | null = null

  constructor(
    private readonly permissions: PermissionsStore,
    private readonly systemVersion: string,
  ) {
    makeAutoObservable<PermissionsWizardStore, "permissions" | "systemVersion">(this, { permissions: false, systemVersion: false })
  }

  get open(): boolean {
    return this.permissions.locked
  }

  // Accessibility is asked first. Screen recording is asked once it is granted.
  get step(): "accessibility" | "screen" {
    if (this.permissions.permissions?.accessibility === true) {
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
    if (this.busy || this.permissions.permissions === null) {
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
    return this.permissions.permissions?.error ?? null
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
