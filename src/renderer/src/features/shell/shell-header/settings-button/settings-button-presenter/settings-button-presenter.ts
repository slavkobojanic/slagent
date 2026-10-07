import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class SettingsButtonPresenter {
  constructor(private readonly overlayStore: OverlayStore) {}

  open = () => {
    this.overlayStore.setOpen("settings", true)
  }
}
