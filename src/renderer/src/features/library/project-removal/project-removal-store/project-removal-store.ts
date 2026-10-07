import { makeAutoObservable } from "mobx"
import type { ProjectSummary } from "@shared/types"

export class ProjectRemovalStore {
  target: ProjectSummary | null = null
  typed = ""
  busy = false

  constructor() {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.target !== null
  }

  get confirmed(): boolean {
    if (this.target === null) {
      return false
    }
    return this.typed === this.target.name
  }

  get canConfirm(): boolean {
    if (this.busy || !this.confirmed) {
      return false
    }
    return true
  }

  setTarget(project: ProjectSummary | null) {
    this.target = project
    this.typed = ""
  }

  setTyped(value: string) {
    this.typed = value
  }

  setBusy(value: boolean) {
    this.busy = value
  }
}
