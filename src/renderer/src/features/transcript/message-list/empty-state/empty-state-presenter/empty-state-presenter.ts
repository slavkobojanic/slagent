import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class EmptyStatePresenter {
  constructor(
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
  ) {}

  chooseFolder = async () => {
    try {
      await this.api.chooseFolder()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  openSettings = () => {
    this.overlayStore.setOpen("settings", true)
  }
}
