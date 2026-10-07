import type { Log } from "@/log/log"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"

export class PanelTogglePresenter {
  constructor(
    private readonly panelStore: PanelStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly log: Log,
  ) {}

  toggle = () => {
    this.log.action("toggle-panel", { open: !this.panelStore.open })
    this.panelPresenter.setOpen(!this.panelStore.open)
  }
}
