import type { Log } from "@/log/log"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { TabletTab } from "@/features/mobile/tablet-shell/tablet-tab"

// The right panel's open state and tab are the shared PanelStore's, so portrait's single tab
// strip and landscape's docked panel are two views of the same state: rotating keeps the tab.
export class TabletPresenter {
  constructor(
    private readonly panelStore: PanelStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly log: Log,
  ) {}

  // Portrait shows the chat while the panel is closed, and the panel's tab otherwise.
  get activeTab(): TabletTab {
    return this.panelStore.open ? this.panelStore.tab : "chat"
  }

  selectTab = (tab: TabletTab) => {
    this.log.action("select-tablet-tab", { tab })
    if (tab === "chat") {
      this.panelPresenter.setOpen(false)
      return
    }
    this.panelPresenter.selectTab(tab)
    this.panelPresenter.setOpen(true)
  }

  togglePanel = () => {
    this.panelPresenter.setOpen(!this.panelStore.open)
  }

  // A file tapped in the diff opens in the source tab.
  openFile = (path: string) => {
    void this.panelPresenter.openFile(path)
  }
}
