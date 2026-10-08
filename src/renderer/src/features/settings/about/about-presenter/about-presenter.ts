import type { AboutStore } from "@/features/settings/about/about-store/about-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"

export class AboutPresenter {
  private unsubscribe: (() => void) | null = null

  constructor(
    private readonly store: AboutStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.unsubscribe !== null) {
      return
    }
    this.unsubscribe = this.api.onUpdateReady(this.handleUpdateReady)
    this.api
      .appVersion()
      .then(this.store.setVersion)
      .catch((error: unknown) => {
        this.log.debug("load-app-version-failed", { error })
      })
    this.api
      .updateStatus()
      .then(this.handleStatus)
      .catch((error: unknown) => {
        this.log.debug("update-status-failed", { error })
      })
  }

  stop = () => {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  handleCheck = async () => {
    if (this.store.checking) {
      return
    }
    this.log.action("check-for-updates")

    this.store.setError(null)
    this.store.setChecking(true)
    try {
      this.store.setResult(await this.api.checkForUpdates())
    } catch (error) {
      this.log.warn("check-for-updates-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setChecking(false)
    }
  }

  handleInstall = async () => {
    if (!this.store.canInstall) {
      return
    }
    this.log.action("install-update", { version: this.store.readyVersion })

    this.store.setError(null)
    this.store.setInstalling(true)
    try {
      await this.api.installUpdate()
    } catch (error) {
      this.log.warn("install-update-failed", { error })
      this.store.setInstalling(false)
      this.store.setError(errorText(error))
    }
  }

  private handleUpdateReady = (version: string) => {
    this.log.info("update-ready", { version })
    this.store.setReadyVersion(version)
  }

  // A status that arrives after stop() is dropped. A null status leaves an update seen by the listener in place.
  private handleStatus = (version: string | null) => {
    if (this.unsubscribe === null || version === null) {
      return
    }
    this.store.setReadyVersion(version)
  }
}