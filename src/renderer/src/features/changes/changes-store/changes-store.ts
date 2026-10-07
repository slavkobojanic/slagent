import { makeAutoObservable } from "mobx"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelStore, RightTab } from "@/state/panel/panel-store/panel-store"

export class ChangesStore {
  constructor(
    private readonly panelStore: PanelStore,
    private readonly runStore: RunStore,
    private readonly metaStore: MetaStore,
  ) {
    makeAutoObservable(this)
  }

  get plan(): string | null {
    if (!this.runStore.planProposal) {
      return null
    }
    return this.runStore.planProposal
  }

  get hasPlan(): boolean {
    return this.plan !== null
  }

  // The panel store keeps the tab the user picked; a file or plan tab with nothing behind it shows the changes.
  get showing(): RightTab {
    if (this.panelStore.tab === "file" && this.panelStore.viewedFile !== null) {
      return "file"
    }
    if (this.panelStore.tab === "plan" && this.hasPlan) {
      return "plan"
    }
    return "changes"
  }

  get changesShown(): boolean {
    if (!this.panelStore.open || this.showing !== "changes") {
      return false
    }
    return true
  }

  get fileTab(): { name: string; path: string } | null {
    const file = this.panelStore.viewedFile
    if (file === null) {
      return null
    }
    return { name: file.path.split("/").pop() ?? file.path, path: file.path }
  }

  get hasFolder(): boolean {
    if (!this.metaStore.meta?.cwd) {
      return false
    }
    return true
  }
}
