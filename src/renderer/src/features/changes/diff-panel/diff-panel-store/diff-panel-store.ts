import { makeAutoObservable } from "mobx"
import type { DiffScope, GitCommit, GitStatus } from "@shared/types"
import type { DiffDraft } from "@/features/changes/diff-panel/diff-draft"
import type { FileDiff } from "@/lib/diff"

export type DiffBusy = "commit" | "message" | "push" | "pr"

export class DiffPanelStore {
  scope: DiffScope = "uncommitted"
  commits: GitCommit[] = []
  status: GitStatus | null = null
  files: FileDiff[] = []
  loading = false
  message = ""
  busy: DiffBusy | null = null
  draft: DiffDraft | null = null

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

  get scopeLabel(): string {
    const scope = this.scope
    if (scope === "uncommitted") return "Uncommitted"
    if (scope === "turn") return "Last turn"
    if (scope === "branch") return "Since branch start"
    const sha = scope.slice("commit:".length)
    const commit = this.commits.find((item) => item.sha === sha)
    return commit?.subject ?? sha.slice(0, 7)
  }

  get emptyText(): string {
    if (this.scope === "turn") {
      return "No changes since the last message with a checkpoint."
    }
    if (!this.repo) {
      return "This folder is not a git repository."
    }
    if (this.scope === "branch") {
      return "No changes since the branch started."
    }
    if (this.scope.startsWith("commit:")) {
      return "No changes in this commit."
    }
    return "No uncommitted changes."
  }

  get commitPlaceholder(): string {
    const count = this.changedCount
    if (count === 0) {
      return "Nothing to commit"
    }
    return `Commit message for ${count} file${count === 1 ? "" : "s"}`
  }

  get pushLabel(): string {
    if (this.status === null || this.status.ahead <= 0) {
      return "Push"
    }
    return `Push ${this.status.ahead}`
  }

  get writingMessage(): boolean {
    return this.busy === "message"
  }

  get canEditMessage(): boolean {
    if (this.changedCount === 0) {
      return false
    }
    return true
  }

  get canWriteMessage(): boolean {
    if (this.changedCount === 0 || this.busy !== null) {
      return false
    }
    return true
  }

  get canCommit(): boolean {
    if (this.changedCount === 0 || this.message.trim() === "" || this.busy !== null) {
      return false
    }
    return true
  }

  get canPublish(): boolean {
    if (this.busy !== null || !this.status?.branch) {
      return false
    }
    return true
  }

  setScope(scope: DiffScope) {
    this.scope = scope
  }

  setCommits(commits: GitCommit[]) {
    this.commits = commits
  }

  setLoading(value: boolean) {
    this.loading = value
  }

  setStatus(status: GitStatus | null) {
    this.status = status
  }

  setFiles(files: FileDiff[]) {
    this.files = files
  }

  setMessage(message: string) {
    this.message = message
  }

  setBusy(busy: DiffBusy | null) {
    this.busy = busy
  }

  setDraft(draft: DiffDraft | null) {
    this.draft = draft
  }
}
