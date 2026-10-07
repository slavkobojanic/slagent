import { makeAutoObservable } from "mobx"
import type { SettingsTab } from "@/features/settings/settings-tab"

// The section the dialog shows. It outlives a close, as the legacy dialog's tab state did,
// so reopening lands on the same section.
export class SettingsStore {
  tab: SettingsTab = "general"

  constructor() {
    makeAutoObservable(this)
  }

  setTab(tab: SettingsTab) {
    this.tab = tab
  }
}
