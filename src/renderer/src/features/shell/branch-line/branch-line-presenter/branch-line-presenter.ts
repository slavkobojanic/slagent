import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { BranchLineStore } from "../branch-line-store/branch-line-store"

export class BranchLinePresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: BranchLineStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    // The main process watches .git/HEAD and publishes a git event when the branch changes.
    this.disposers = [
      this.api.onEvent((event) => {
        if (event.type === "git") {
          void this.refresh()
        }
      }),
      // Switching projects points the watcher at another folder, so the label follows.
      this.log.reaction("cwd", () => this.metaStore.meta?.cwd, (cwd) => this.refresh(cwd)),
    ]
  }

  stop = () => {
    for (const dispose of this.disposers) dispose()
    this.disposers = []
  }

  private refresh = async (cwd?: string) => {
    try {
      this.store.setStatus(await this.api.gitStatus())
    } catch (error) {
      // No folder open yet, or git failed: the line stays hidden rather than erroring the UI.
      this.log.debug("branch-status-failed", { cwd, error: errorText(error) })
    }
  }
}