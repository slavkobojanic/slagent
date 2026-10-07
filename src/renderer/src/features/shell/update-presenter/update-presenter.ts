import type { UpdateService } from "@/ipc/update-service/update-service"
import { errorText } from "@/lib/format"
import type { UpdateStore } from "@/features/shell/update-store/update-store"

// Shows a downloaded update in the header and installs it on request. The update-ready listener
// lives from start() until stop().
export class UpdatePresenter {
  private unsubscribe: (() => void) | null = null

  constructor(
    private readonly store: UpdateStore,
    private readonly updates: Pick<UpdateService, "updateStatus" | "installUpdate" | "onUpdateReady">,
  ) {}

  start = () => {
    if (this.unsubscribe !== null) {
      return
    }
    this.unsubscribe = this.updates.onUpdateReady(this.handleUpdateReady)
    this.updates
      .updateStatus()
      .then(this.handleStatus)
      .catch(() => undefined)
  }

  stop = () => {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  installUpdate = async () => {
    if (!this.store.canInstall) {
      return
    }

    this.store.setError(null)
    this.store.setInstalling(true)
    try {
      await this.updates.installUpdate()
    } catch (error) {
      this.store.setInstalling(false)
      this.store.setError(errorText(error))
    }
  }

  private handleUpdateReady = (version: string) => {
    this.store.setVersion(version)
  }

  // A status that arrives after stop() is dropped. A null status leaves an update seen by the listener in place.
  private handleStatus = (version: string | null) => {
    if (this.unsubscribe === null || version === null) {
      return
    }
    this.store.setVersion(version)
  }
}
