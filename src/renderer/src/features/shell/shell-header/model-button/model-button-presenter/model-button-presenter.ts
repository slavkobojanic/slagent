import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class ModelButtonPresenter {
  constructor(private readonly overlayStore: OverlayStore) {}

  open = () => {
    this.overlayStore.setOpen("model", true)
  }
}
