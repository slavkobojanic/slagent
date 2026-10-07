import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { UpdateButtonStore } from "@/features/shell/shell-header/update-button/update-button-store/update-button-store"

export class UpdateButtonPresenter {
  private unsubscribe: (() => void) | null = null

  constructor(
    private readonly store: UpdateButtonStore,
    private readonly api: API,
  ) {}

  start = () => {
    if (this.unsubscribe !== null) {
      return
    }
    this.unsubscribe = this.api.onUpdateReady(this.handleUpdateReady)
    this.api
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
      await this.api.installUpdate()
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
