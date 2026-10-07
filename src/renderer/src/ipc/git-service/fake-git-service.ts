import type { GitStatus } from "@shared/types"
import type { GitService } from "./git-service"

// A folder that is not a git repository, so views show the no-repo state.
export class FakeGitService implements GitService {
  gitStatus = async (): Promise<GitStatus> => ({
    repo: false,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    files: [],
  })
  gitDiff = async () => ""
  gitCommit = async () => ""
  gitPush = async () => {}
  gitPullRequest = async () => ""
  gitCommitMessage = async () => ""
}
