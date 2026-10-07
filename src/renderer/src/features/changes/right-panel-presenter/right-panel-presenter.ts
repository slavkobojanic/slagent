import type { RightPanelStore } from "@/features/changes/right-panel-store/right-panel-store"
import type { CommandRegistry } from "@/state/command-registry"
import type { LayoutPresenter } from "@/state/layout-presenter"
import type { PanelPresenter } from "@/state/panel-presenter"
import type { PanelStore, RightTab } from "@/state/panel-store"

// The right panel's tabs, its close buttons, its resize handle, and the command that toggles it.
export class RightPanelPresenter {
  private unregister: (() => void) | null = null

  constructor(
    private readonly store: RightPanelStore,
    private readonly panel: PanelStore,
    private readonly panelPresenter: Pick<PanelPresenter, "selectTab" | "setOpen">,
    private readonly layout: Pick<LayoutPresenter, "handleResizeStart" | "handleResizeReset">,
    private readonly commands: Pick<CommandRegistry, "register">,
  ) {}

  start = () => {
    if (this.unregister !== null) {
      return
    }
    this.unregister = this.commands.register({
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

  // Hides the panel when it is already on the changes tab, and otherwise shows the changes tab.
  // This reads the raw tab, as the legacy header toggle did, not the tab on screen.
  handleToggle = () => {
    if (this.panel.open && this.panel.tab === "changes") {
      this.panelPresenter.setOpen(false)
      return
    }
    this.panelPresenter.selectTab("changes")
    this.panelPresenter.setOpen(true)
  }

  handleTab = (tab: RightTab) => {
    this.panelPresenter.selectTab(tab)
  }

  handleClose = () => {
    this.panelPresenter.setOpen(false)
  }

  // Forgets the open file and goes back to the changes tab. The panel stays open.
  handleCloseFile = () => {
    this.panel.setViewedFile(null)
    this.panelPresenter.selectTab("changes")
  }

  // Takes the fields the layout presenter reads, so a pointer event from the handle or a test both fit.
  handleResizeStart = (event: Pick<PointerEvent, "button" | "clientX" | "preventDefault">) => {
    this.layout.handleResizeStart("diff", event)
  }

  handleResizeReset = () => {
    this.layout.handleResizeReset("diff")
  }
}
