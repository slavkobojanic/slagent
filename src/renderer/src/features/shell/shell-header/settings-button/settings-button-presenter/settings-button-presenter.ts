import type { Log } from "@/log/log"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class SettingsButtonPresenter {
  constructor(
    private readonly overlayStore: OverlayStore,
    private readonly log: Log,
  ) {}

  open = () => {
    this.log.action("open-settings")
    this.overlayStore.setOpen("settings", true)
  }
}
