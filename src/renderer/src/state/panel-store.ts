import { makeAutoObservable, observableRef } from "mobx"
import type { FileView } from "@shared/types"

export type RightTab = "changes" | "file" | "plan"

// The right panel: whether it is open, which tab shows, and the file open in it.
export class PanelStore {
  open = false
  tab: RightTab = "changes"
  viewedFile: FileView | null = null

  constructor() {
    makeAutoObservable(this, { viewedFile: observableRef })
  }

  setOpen(open: boolean) {
    this.open = open
  }

  setTab(tab: RightTab) {
    this.tab = tab
  }

  setViewedFile(file: FileView | null) {
    this.viewedFile = file
  }
}
