import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText } from "@/lib/format"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

const POLL_MS = 1000

export class PermissionsPresenter {
  private timer: number | null = null
  private running = false

  constructor(
    private readonly store: PermissionsStore,
    private readonly api: API,
    private readonly platform: string,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.running || this.platform !== "darwin") {
      return
    }
    this.running = true
    void this.refresh()
    this.timer = this.window.setInterval(this.refresh, POLL_MS)
  }

  stop = () => {
    this.running = false
    this.clearTimer()
  }

  // A reply that arrives after stop() is dropped, so a late read cannot change the lock.
  refresh = async () => {
    try {
      const next = await this.api.getPermissions()
      if (!this.running) {
        return
      }
      this.store.setPermissions(next)
      if (next.accessibility && next.screenRecording) {
        this.log.debug("granted", next)
        this.clearTimer()
      }
    } catch (error) {
      if (!this.running) {
        return
      }
      this.log.warn("refresh-failed", { error })
      this.store.setPermissions({ accessibility: false, screenRecording: false, error: errorText(error) })
    }
  }

  private clearTimer = () => {
    if (this.timer === null) {
      return
    }
    this.window.clearInterval(this.timer)
    this.timer = null
  }
}
