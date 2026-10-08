import type { AppCloseStore } from "@/features/app-close/app-close-store/app-close-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

export class AppClosePresenter {
  constructor(
    private readonly store: AppCloseStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    return this.api.onCloseRequest(() => {
      this.log.action("close-requested")
      this.store.setOpen(true)
    })
  }

  handleCancel = () => {
    if (this.store.busy) {
      return
    }
    this.log.action("cancel-close-app")
    this.store.setOpen(false)
  }

  handleConfirm = async () => {
    if (!this.store.canConfirm) {
      return
    }
    this.log.action("close-app")
    this.store.setBusy(true)
    try {
      await this.api.closeApp()
    } catch (error) {
      this.log.warn("close-app-failed", { error })
    } finally {
      this.store.setBusy(false)
    }
  }
}
