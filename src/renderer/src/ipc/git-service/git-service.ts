import type { DiffScope, GitStatus, SlagentApi } from "@shared/types"

export interface GitService {
  gitStatus(): Promise<GitStatus>
  gitDiff(scope: DiffScope): Promise<string>
  gitCommit(message: string): Promise<string>
  gitPush(): Promise<void>
  gitPullRequest(): Promise<string>
  gitCommitMessage(): Promise<string>
}

export class IpcGitService implements GitService {
  constructor(private readonly api: SlagentApi) {}

  gitStatus = () => this.api.gitStatus()
  gitDiff = (scope: DiffScope) => this.api.gitDiff(scope)
  gitCommit = (message: string) => this.api.gitCommit(message)
  gitPush = () => this.api.gitPush()
  gitPullRequest = () => this.api.gitPullRequest()
  gitCommitMessage = () => this.api.gitCommitMessage()
}
