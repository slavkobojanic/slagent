import { makeAutoObservable } from "mobx"
import type { GitStatus } from "@shared/types"
import { parseDiff, type FileDiff } from "@/lib/diff"

// The chat's changes screen: uncommitted git changes, read-only. The status is
// kept even while the chat screen shows, so its header can badge the count.
export class MobileChangesStore {
  status: GitStatus | null = null
  files: FileDiff[] = []
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  get repo(): boolean {
    return this.status?.repo ?? false
  }

  get changedCount(): number {
    return this.status?.files.length ?? 0
  }

  get branchLabel(): string {
    const branch = this.status?.branch ?? null
    if (branch !== null) {
      return branch
    }
    if (this.repo) {
      return "Detached"
    }
    return "Changes"
  }

  get emptyText(): string {
    if (!this.repo) {
      return "This folder is not a git repository."
    }
    return "No uncommitted changes."
  }

  setStatus(status: GitStatus | null) {
    this.status = status
  }

  setFiles(diff: string) {
    this.files = parseDiff(diff)
  }

  setLoading(value: boolean) {
    this.loading = value
  }
}
