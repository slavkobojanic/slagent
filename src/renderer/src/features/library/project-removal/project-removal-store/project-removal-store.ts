import { makeAutoObservable, observableRef } from "mobx"
import type { ProjectSummary } from "@shared/types"

// The project waiting in the remove confirmation, what the user has typed to confirm, and whether the removal is running.
export class ProjectRemovalStore {
  target: ProjectSummary | null = null
  typed = ""
  busy = false

  constructor() {
    makeAutoObservable(this, { target: observableRef })
  }

  get open(): boolean {
    return this.target !== null
  }

  // The user must type the project's name exactly.
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

  // A new target starts with nothing typed.
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
