import { makeAutoObservable } from "mobx"
import type { MetaStore } from "@/mirror/meta-store"
import type { RunStore } from "@/mirror/run-store"
import type { PanelStore, RightTab } from "@/state/panel-store"

// What the right panel shows. The panel store keeps the tab the user picked. This store
// falls back to the changes tab when that tab names a file or a plan that is not there.
export class RightPanelStore {
  constructor(
    private readonly panel: PanelStore,
    private readonly run: Pick<RunStore, "planProposal">,
    private readonly meta: Pick<MetaStore, "meta">,
  ) {
    makeAutoObservable<RightPanelStore, "panel" | "run" | "meta">(this, { panel: false, run: false, meta: false })
  }

  // The plan the agent proposed, or null when there is none.
  get plan(): string | null {
    if (!this.run.planProposal) {
      return null
    }
    return this.run.planProposal
  }

  get hasPlan(): boolean {
    return this.plan !== null
  }

  // The tab on screen. A file or plan tab with nothing behind it shows the changes.
  get showing(): RightTab {
    if (this.panel.tab === "file" && this.panel.viewedFile !== null) {
      return "file"
    }
    if (this.panel.tab === "plan" && this.hasPlan) {
      return "plan"
    }
    return "changes"
  }

  // The diff loads only while it is on screen.
  get changesShown(): boolean {
    if (!this.panel.open || this.showing !== "changes") {
      return false
    }
    return true
  }

  // The file tab's label and full path. Null when no file is open.
  get fileTab(): { name: string; path: string } | null {
    const file = this.panel.viewedFile
    if (file === null) {
      return null
    }
    return { name: file.path.split("/").pop() ?? file.path, path: file.path }
  }

  // The panel needs a folder: the header button and the shortcut are off without one.
  get hasFolder(): boolean {
    if (!this.meta.meta?.cwd) {
      return false
    }
    return true
  }
}
