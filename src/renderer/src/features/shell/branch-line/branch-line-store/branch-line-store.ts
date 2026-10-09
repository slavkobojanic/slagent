import { makeAutoObservable } from "mobx"
import type { GitStatus } from "@shared/types"

// The git branch of the open project, shown in the terminal bar.
export class BranchLineStore {
  status: GitStatus | null = null

  constructor() {
    makeAutoObservable(this)
  }

  // The line only makes sense in a repository, so it hides everywhere else.
  get visible(): boolean {
    return this.status?.repo === true
  }

  get label(): string {
    const branch = this.status?.branch ?? null
    if (branch !== null) {
      return branch
    }
    return "Detached"
  }

  setStatus(status: GitStatus) {
    this.status = status
  }
}