import { makeAutoObservable } from "mobx"

export type OverlayKind = "settings" | "model" | "palette" | "create-skill"

export class OverlayStore {
  settingsOpen = false
  modelOpen = false
  paletteOpen = false
  createSkillOpen = false

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
    if (kind === "create-skill") {
      this.createSkillOpen = open
      return
    }
    this.paletteOpen = open
  }
}
