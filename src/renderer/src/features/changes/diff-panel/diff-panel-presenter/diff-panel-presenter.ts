import { toast } from "sonner"
import type { DiffComment, DiffScope } from "@shared/types"
import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import type { DiffDraft } from "@/features/changes/diff-panel/diff-draft"
import type { DiffBusy, DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
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
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      // A run that ends refreshes the diff once more, to catch any write the
      // live events missed, but only while the diff is on screen.
      this.log.reaction(
        "streaming",
        () => this.runStore.streaming,
        (streaming, wasStreaming) => {
          if (wasStreaming && !streaming && this.changesStore.changesShown) {
            void this.handleRefresh()
          }
        },
      ),
      // The diff loads when it comes on screen, even mid-run.
      this.log.reaction(
        "changes-shown",
        () => this.changesStore.changesShown,
        (shown) => {
          if (shown) {
            void this.handleRefresh()
          }
        },
      ),
      // The main process publishes git events while the agent changes files, so the
      // open diff follows the edits live.
      this.api.onEvent((event) => {
        if (event.type === "git" && this.changesStore.changesShown) {
          void this.handleRefresh()
        }
      }),
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
    const scope = this.store.scope
    try {
      await this.log.span(
        "load-diff",
        async () => {
          const [status, diff] = await Promise.all([this.api.gitStatus(), this.api.gitDiff(scope)])
          this.store.setStatus(status)
          this.store.setFiles(parseDiff(diff))
          this.dropDraftWithoutFile()
        },
        { scope },
      )
    } catch (error) {
      this.log.warn("load-diff-failed", { scope, error })
      toast.error(errorText(error))
    } finally {
      this.store.setLoading(false)
    }
  }

  handleScope = (scope: DiffScope) => {
    if (scope === this.store.scope) {
      return
    }
    this.log.action("select-scope", { scope })
    this.store.setScope(scope)
    // The scope picker only exists inside the open panel, so a closed panel is left alone.
    if (!this.changesStore.changesShown) {
      return
    }
    void this.handleRefresh()
  }

  handleMessageChange = (value: string) => {
    this.store.setMessage(value)
  }

  handleCommit = () => {
    this.log.action("commit", { message: this.store.message })
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
    this.log.action("write-message")
    void this.act("message", async () => {
      this.store.setMessage(await this.api.gitCommitMessage())
    })
  }

  handlePush = () => {
    this.log.action("push")
    void this.act("push", async () => {
      await this.api.gitPush()
      toast.success("Pushed")
    })
  }

  handleOpenPr = () => {
    this.log.action("open-pr")
    void this.act("pr", async () => {
      const url = await this.api.gitPullRequest()
      toast.success("Pull request ready", {
        action: { label: "Open", onClick: () => void this.api.openExternal(url) },
      })
    })
  }

  handleStartDraft = (path: string, side: DiffComment["side"], line: number) => {
    this.log.action("start-draft", { path, side, line })
    this.store.setDraft({ path, side, line })
  }

  handleDraftCancel = () => {
    this.log.action("cancel-draft")
    this.store.setDraft(null)
  }

  handleDraftSave = (text: string) => {
    const draft = this.store.draft
    if (draft === null) {
      return
    }
    this.log.action("save-draft", { ...draft, text })
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
    this.log.action("remove-comment", { id })
    this.reviewPresenter.removeDiffComment(id)
  }

  handleViewFile = (path: string) => {
    this.log.action("view-file", { path })
    void this.panelPresenter.openFile(path)
  }

  private act = async (name: DiffBusy, task: () => Promise<void>) => {
    this.store.setBusy(name)
    try {
      await task()
    } catch (error) {
      this.log.warn(`${name}-failed`, { error })
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
