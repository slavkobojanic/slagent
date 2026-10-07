import { reaction } from "mobx"
import type { DiffComment, DiffScope } from "@shared/types"
import type { DiffBusy, DiffStore } from "@/features/changes/diff-store/diff-store"
import type { DiffDraft } from "@/features/changes/diff-draft"
import type { RightPanelStore } from "@/features/changes/right-panel-store/right-panel-store"
import type { RunStore } from "@/mirror/run-store"
import type { AppService } from "@/ipc/app-service/app-service"
import type { GitService } from "@/ipc/git-service/git-service"
import { lineText, parseDiff, type FileDiff } from "@/lib/diff"
import { errorText } from "@/lib/format"
import type { PanelPresenter } from "@/state/panel-presenter"
import type { ReviewPresenter } from "@/state/review-presenter"

// The success and error messages the changes tab shows. The view layer provides the toaster.
export type DiffNotifier = {
  success(message: string, options?: { action?: { label: string; onClick: () => void } }): void
  error(message: string): void
}

// The changes tab: the git status and diff, the commit box, and the comments written on lines of
// the diff. Git calls go through the service; the presenter only writes the diff store.
export class DiffPresenter {
  private started = false
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: DiffStore,
    private readonly right: Pick<RightPanelStore, "changesShown">,
    private readonly run: Pick<RunStore, "streaming">,
    private readonly git: Pick<GitService, "gitStatus" | "gitDiff" | "gitCommit" | "gitPush" | "gitPullRequest" | "gitCommitMessage">,
    private readonly app: Pick<AppService, "openExternal">,
    private readonly panel: Pick<PanelPresenter, "openFile">,
    private readonly review: Pick<ReviewPresenter, "addDiffComment" | "removeDiffComment">,
    private readonly notify: DiffNotifier,
    private readonly newId: () => string,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      // A run that ends refreshes the diff, but only while the diff is on screen.
      reaction(
        () => this.run.streaming,
        (streaming, wasStreaming) => {
          if (wasStreaming && !streaming && this.right.changesShown) {
            void this.handleRefresh()
          }
        },
      ),
      // The diff loads when it comes on screen. While a run is going, the run's end loads it instead.
      reaction(
        () => this.right.changesShown,
        (shown) => {
          if (shown && !this.run.streaming) {
            void this.handleRefresh()
          }
        },
      ),
    ]
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  // Loads the git status and the diff for the current scope. Used by the refresh button and by
  // the reactions above, and after every git action.
  handleRefresh = async () => {
    this.store.setLoading(true)
    try {
      const [status, diff] = await Promise.all([this.git.gitStatus(), this.git.gitDiff(this.store.scope)])
      this.store.setStatus(status)
      this.store.setFiles(parseDiff(diff))
      this.dropDraftWithoutFile()
    } catch (error) {
      this.notify.error(errorText(error))
    } finally {
      this.store.setLoading(false)
    }
  }

  handleScope = (scope: DiffScope) => {
    if (scope === this.store.scope) {
      return
    }
    this.store.setScope(scope)
    if (!this.right.changesShown || this.run.streaming) {
      return
    }
    void this.handleRefresh()
  }

  handleMessageChange = (value: string) => {
    this.store.setMessage(value)
  }

  handleCommit = () => {
    void this.act("commit", async () => {
      const sha = await this.git.gitCommit(this.store.message)
      this.store.setMessage("")
      this.notify.success(`Committed ${sha}`)
    })
  }

  // Cmd+Enter in the message box commits, as long as there is a message to commit.
  handleCommitShortcut = () => {
    if (this.store.message.trim() === "") {
      return
    }
    this.handleCommit()
  }

  handleWriteMessage = () => {
    void this.act("message", async () => {
      this.store.setMessage(await this.git.gitCommitMessage())
    })
  }

  handlePush = () => {
    void this.act("push", async () => {
      await this.git.gitPush()
      this.notify.success("Pushed")
    })
  }

  handleOpenPr = () => {
    void this.act("pr", async () => {
      const url = await this.git.gitPullRequest()
      this.notify.success("Pull request ready", {
        action: { label: "Open", onClick: () => void this.app.openExternal(url) },
      })
    })
  }

  handleStartDraft = (path: string, side: DiffComment["side"], line: number) => {
    this.store.setDraft({ path, side, line })
  }

  handleDraftCancel = () => {
    this.store.setDraft(null)
  }

  // Saves the open comment box as a review comment on its line, with that line's text quoted.
  handleDraftSave = (text: string) => {
    const draft = this.store.draft
    if (draft === null) {
      return
    }
    const file = this.store.files.find((item) => item.path === draft.path)
    this.review.addDiffComment({
      id: this.newId(),
      path: draft.path,
      line: draft.line,
      side: draft.side,
      code: quoteLine(file, draft),
      text,
    })
    this.store.setDraft(null)
  }

  handleRemoveComment = (id: string) => {
    this.review.removeDiffComment(id)
  }

  handleViewFile = (path: string) => {
    void this.panel.openFile(path)
  }

  // Runs one git action with its busy flag set, then refreshes the diff whether it worked or not.
  private act = async (name: DiffBusy, task: () => Promise<void>) => {
    this.store.setBusy(name)
    try {
      await task()
    } catch (error) {
      this.notify.error(errorText(error))
    } finally {
      this.store.setBusy(null)
      void this.handleRefresh()
    }
  }

  // A comment box belongs to a file in the diff. When a refresh drops that file, the box goes too.
  private dropDraftWithoutFile = () => {
    const draft = this.store.draft
    if (draft === null) {
      return
    }
    if (this.store.files.some((file) => file.path === draft.path)) {
      return
    }
    this.store.setDraft(null)
  }
}

function quoteLine(file: FileDiff | undefined, draft: DiffDraft): string {
  if (file === undefined) {
    return ""
  }
  return lineText(file, draft.side, draft.line)
}
