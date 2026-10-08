import { makeAutoObservable } from "mobx"
import type { GitStatus } from "@shared/types"

// The git branch of the open project, shown as a line beneath the chat.
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

  get aheadBehind(): string | null {
    const status = this.status
    if (status === null) return null
    const parts: string[] = []
    if (status.ahead > 0) parts.push(`${status.ahead} up`)
    if (status.behind > 0) parts.push(`${status.behind} down`)
    return parts.length === 0 ? null : parts.join(", ")
  }

  setStatus(status: GitStatus) {
    this.status = status
  }
}