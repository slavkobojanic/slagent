import { reaction } from "mobx"
import { toast } from "sonner"
import type { DiffComment, DiffScope } from "@shared/types"
import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import type { DiffDraft } from "@/features/changes/diff-panel/diff-draft"
import type { DiffBusy, DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import type { API } from "@/ipc/api"
import { lineText, parseDiff, type FileDiff } from "@/lib/diff"
import { errorText } from "@/lib/format"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"

export class DiffPanelPresenter {
  private started = false
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: DiffPanelStore,
    private readonly changesStore: ChangesStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly panelPresenter: PanelPresenter,
    private readonly reviewPresenter: ReviewPresenter,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      // A run that ends refreshes the diff, but only while the diff is on screen.
      reaction(
        () => this.runStore.streaming,
        (streaming, wasStreaming) => {
          if (wasStreaming && !streaming && this.changesStore.changesShown) {
            void this.handleRefresh()
          }
        },
      ),
      // The diff loads when it comes on screen. While a run is going, the run's end loads it instead.
      reaction(
        () => this.changesStore.changesShown,
        (shown) => {
          if (shown && !this.runStore.streaming) {
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

  handleRefresh = async () => {
    this.store.setLoading(true)
    try {
      const [status, diff] = await Promise.all([this.api.gitStatus(), this.api.gitDiff(this.store.scope)])
      this.store.setStatus(status)
      this.store.setFiles(parseDiff(diff))
      this.dropDraftWithoutFile()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setLoading(false)
    }
  }

  handleScope = (scope: DiffScope) => {
    if (scope === this.store.scope) {
      return
    }
    this.store.setScope(scope)
    if (!this.changesStore.changesShown || this.runStore.streaming) {
      return
    }
    void this.handleRefresh()
  }

  handleMessageChange = (value: string) => {
    this.store.setMessage(value)
  }

  handleCommit = () => {
    void this.act("commit", async () => {
      const sha = await this.api.gitCommit(this.store.message)
      this.store.setMessage("")
      toast.success(`Committed ${sha}`)
    })
  }

  handleCommitShortcut = () => {
    if (this.store.message.trim() === "") {
      return
    }
    this.handleCommit()
  }

  handleWriteMessage = () => {
    void this.act("message", async () => {
      this.store.setMessage(await this.api.gitCommitMessage())
    })
  }

  handlePush = () => {
    void this.act("push", async () => {
      await this.api.gitPush()
      toast.success("Pushed")
    })
  }

  handleOpenPr = () => {
    void this.act("pr", async () => {
      const url = await this.api.gitPullRequest()
      toast.success("Pull request ready", {
        action: { label: "Open", onClick: () => void this.api.openExternal(url) },
      })
    })
  }

  handleStartDraft = (path: string, side: DiffComment["side"], line: number) => {
    this.store.setDraft({ path, side, line })
  }

  handleDraftCancel = () => {
    this.store.setDraft(null)
  }

  handleDraftSave = (text: string) => {
    const draft = this.store.draft
    if (draft === null) {
      return
    }
    const file = this.store.files.find((item) => item.path === draft.path)
    this.reviewPresenter.addDiffComment({
      id: this.window.crypto.randomUUID(),
      path: draft.path,
      line: draft.line,
      side: draft.side,
      code: quoteLine(file, draft),
      text,
    })
    this.store.setDraft(null)
  }

  handleRemoveComment = (id: string) => {
    this.reviewPresenter.removeDiffComment(id)
  }

  handleViewFile = (path: string) => {
    void this.panelPresenter.openFile(path)
  }

  private act = async (name: DiffBusy, task: () => Promise<void>) => {
    this.store.setBusy(name)
    try {
      await task()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setBusy(null)
      void this.handleRefresh()
    }
  }

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
