import { makeAutoObservable } from "mobx"
import type { ProjectSummary } from "@shared/types"

export class ProjectAppearanceStore {
  // The project being customised, snapshotted so the dialog keeps working
  // while the library event reshapes the sidebar.
  target: ProjectSummary | null = null
  icon: string | null = null
  color: string | null = null
  busy = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.target !== null
  }

  get canConfirm(): boolean {
    if (this.busy) {
      return false
    }
    return true
  }

  setTarget(project: ProjectSummary | null) {
    this.target = project
    this.icon = project?.icon ?? null
    this.color = project?.color ?? null
    this.error = null
  }

  setIcon(icon: string | null) {
    this.icon = icon
  }

  setColor(color: string | null) {
    this.color = color
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.error = message
  }
}
