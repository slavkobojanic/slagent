import { makeAutoObservable } from "mobx"

export type OverlayKind = "settings" | "model" | "palette"

// Which app-level dialogs are open. Each dialog's own open state lives with its feature.
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
