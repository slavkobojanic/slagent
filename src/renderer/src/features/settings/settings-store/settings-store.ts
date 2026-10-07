import { makeAutoObservable } from "mobx"
import type { SettingsTab } from "@/features/settings/settings-tab"

// The tab outlives a close, so reopening lands on the same section.
export class SettingsStore {
  tab: SettingsTab = "general"

  constructor() {
    makeAutoObservable(this)
  }

  setTab(tab: SettingsTab) {
    this.tab = tab
  }
}
