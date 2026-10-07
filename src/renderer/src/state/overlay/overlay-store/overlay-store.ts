import { makeAutoObservable } from "mobx"

export type OverlayKind = "settings" | "model" | "palette"

export class OverlayStore {
  settingsOpen = false
  modelOpen = false
  paletteOpen = false

  constructor() {
    makeAutoObservable(this)
  }

  setOpen(kind: OverlayKind, open: boolean) {
    if (kind === "settings") {
      this.settingsOpen = open
      return
    }
    if (kind === "model") {
      this.modelOpen = open
      return
    }
    this.paletteOpen = open
  }
}
