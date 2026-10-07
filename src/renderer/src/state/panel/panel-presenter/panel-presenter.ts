import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { FileView } from "@shared/types"
import type { PanelStore, RightTab } from "@/state/panel/panel-store/panel-store"

export class PanelPresenter {
  constructor(
    private readonly store: PanelStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  // The main process parses a line as a :line suffix on the path. A path that is not a file
  // does nothing, so inline code that only looks like a path stays inert.
  openFile = async (path: string, line?: number) => {
    const target = line === undefined ? path : `${path}:${line}`
    this.log.debug("open-file", { target })
    let file: FileView | null
    try {
      file = await this.log.span("load-file", () => this.api.readFile(target), { target })
    } catch (error) {
      this.log.warn("open-file-failed", { target, error })
      return
    }
    if (file === null) {
      this.log.debug("open-file-missing", { target })
      return
    }
    this.showFile(file)
  }

  showFile = (file: FileView) => {
    this.store.setViewedFile(file)
    this.store.setTab("file")
    this.store.setOpen(true)
  }

  showPlan = () => {
    this.store.setTab("plan")
    this.store.setOpen(true)
  }

  selectTab = (tab: RightTab) => {
    this.log.action("select-tab", { tab })
    this.store.setTab(tab)
  }

  setOpen = (open: boolean) => {
    this.log.action("set-open", { open })
    this.store.setOpen(open)
  }

  reset = () => {
    this.log.debug("reset")
    this.store.setViewedFile(null)
    this.store.setTab("changes")
    this.store.setOpen(false)
  }
}
