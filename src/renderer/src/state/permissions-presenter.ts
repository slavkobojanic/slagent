import type { PermissionService } from "@/ipc/permission-service/permission-service"
import { errorText } from "@/lib/format"
import type { AppEnv } from "@/state/app-deps"
import type { PermissionsStore } from "@/state/permissions-store"

const POLL_MS = 1000

// Reads the macOS permissions into the store. The store locks the window while either one is
// missing, so the read repeats every second until both are granted. Other platforms never lock,
// so they are never read.
export class PermissionsPresenter {
  private timer: number | null = null
  private running = false

  constructor(
    private readonly store: PermissionsStore,
    private readonly service: Pick<PermissionService, "getPermissions">,
    private readonly platform: string,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.running || this.platform !== "darwin") {
      return
    }
    this.running = true
    void this.refresh()
    this.timer = this.env.window.setInterval(this.refresh, POLL_MS)
  }

  stop = () => {
    this.running = false
    this.clearTimer()
  }

  // Reads once and writes the result. The poll runs this every second until both are granted.
  // A reply that arrives after stop() is dropped, so a late read cannot change the lock.
  refresh = async () => {
    try {
      const next = await this.service.getPermissions()
      if (!this.running) {
        return
      }
      this.store.setPermissions(next)
      if (next.accessibility && next.screenRecording) {
        this.clearTimer()
      }
    } catch (error) {
      if (!this.running) {
        return
      }
      this.store.setPermissions({ accessibility: false, screenRecording: false, error: errorText(error) })
    }
  }

  private clearTimer = () => {
    if (this.timer === null) {
      return
    }
    this.env.window.clearInterval(this.timer)
    this.timer = null
  }
}
