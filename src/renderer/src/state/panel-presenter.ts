import type { FileService } from "@/ipc/file-service/file-service"
import type { FileView } from "@shared/types"
import type { PanelStore, RightTab } from "@/state/panel-store"

// Shows a file in the right panel. A path that is not a file does nothing, so inline code
// that only looks like a path stays inert.
export class PanelPresenter {
  constructor(
    private readonly store: PanelStore,
    private readonly files: Pick<FileService, "readFile">,
  ) {}

  // A line is passed the way the main process parses it: as a :line suffix on the path.
  openFile = async (path: string, line?: number) => {
    const target = line === undefined ? path : `${path}:${line}`
    let file: FileView | null
    try {
      file = await this.files.readFile(target)
    } catch {
      return
    }
    if (file === null) {
      return
    }
    this.showFile(file)
  }

  // Shows a file that has already been read.
  showFile = (file: FileView) => {
    this.store.setViewedFile(file)
    this.store.setTab("file")
    this.store.setOpen(true)
  }

  selectTab = (tab: RightTab) => {
    this.store.setTab(tab)
  }

  setOpen = (open: boolean) => {
    this.store.setOpen(open)
  }

  // Closes the panel and forgets the open file. Used when the open chat changes.
  reset = () => {
    this.store.setViewedFile(null)
    this.store.setTab("changes")
    this.store.setOpen(false)
  }
}
