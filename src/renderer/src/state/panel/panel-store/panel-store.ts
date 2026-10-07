import { makeAutoObservable } from "mobx"
import type { FileView } from "@shared/types"

export type RightTab = "changes" | "file" | "plan"

export class PanelStore {
  open = false
  tab: RightTab = "changes"
  viewedFile: FileView | null = null

  constructor() {
    makeAutoObservable(this)
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
