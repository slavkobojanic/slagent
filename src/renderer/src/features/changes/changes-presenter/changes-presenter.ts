import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import type { Log } from "@/log/log"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore, RightTab } from "@/state/panel/panel-store/panel-store"

export class ChangesPresenter {
  private unregister: (() => void) | null = null

  constructor(
    private readonly store: ChangesStore,
    private readonly panelStore: PanelStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly layoutPresenter: LayoutPresenter,
    private readonly commandRegistry: CommandRegistry,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.unregister !== null) {
      return
    }
    this.unregister = this.commandRegistry.register({
      id: "changes.toggle",
      label: "Show changes and commit",
      group: "Actions",
      shortcut: { key: "d", mod: true, shift: true },
      enabled: () => this.store.hasFolder,
      run: this.handleToggle,
    })
  }

  stop = () => {
    this.unregister?.()
    this.unregister = null
  }

  // Reads the raw tab, as the legacy header toggle did, not the tab on screen.
  handleToggle = () => {
    if (this.panelStore.open && this.panelStore.tab === "changes") {
      this.log.action("toggle-changes", { open: false })
      this.panelPresenter.setOpen(false)
      return
    }
    this.log.action("toggle-changes", { open: true })
    this.panelPresenter.selectTab("changes")
    this.panelPresenter.setOpen(true)
  }

  handleTab = (tab: RightTab) => {
    this.log.action("select-tab", { tab })
    this.panelPresenter.selectTab(tab)
  }

  handleClose = () => {
    this.log.action("close-panel")
    this.panelPresenter.setOpen(false)
  }

  handleCloseFile = () => {
    this.log.action("close-file", { path: this.panelStore.viewedFile?.path })
    this.panelStore.setViewedFile(null)
    this.panelPresenter.selectTab("changes")
  }

  handleResizeStart = (event: Pick<PointerEvent, "button" | "clientX" | "preventDefault">) => {
    this.layoutPresenter.handleResizeStart("diff", event)
  }

  handleResizeReset = () => {
    this.log.action("reset-width")
    this.layoutPresenter.handleResizeReset("diff")
  }
}
