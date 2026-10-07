import type { ComputerPermissions } from "@shared/types"
import type { PermissionsWizardStore } from "@/features/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

export class PermissionsWizardPresenter {
  constructor(
    private readonly store: PermissionsWizardStore,
    private readonly api: API,
    private readonly permissionsStore: PermissionsStore,
    private readonly log: Log,
  ) {}

  handleAllowAccessibility = async () => {
    if (!this.store.canAllowAccessibility) {
      return
    }
    this.log.action("allow-accessibility")
    await this.request(() => this.api.requestAccessibility())
  }

  handleAllowScreenRecording = async () => {
    if (!this.store.canAllowScreenRecording) {
      return
    }
    this.log.action("allow-screen-recording")
    await this.request(() => this.api.requestScreenRecording())
  }

  handleOpenSettings = async (pane: "accessibility" | "screen") => {
    this.log.action("open-settings", { pane })
    try {
      await this.api.openPermissionSettings(pane)
    } catch (error) {
      this.log.warn("open-settings-failed", { pane, error })
      this.store.setError(errorText(error))
    }
  }

  // The grant the main process returns is the new permission state. A failed request leaves
  // the permissions as they were and shows the error instead.
  private request = async (ask: () => Promise<ComputerPermissions>) => {
    this.store.setBusy(true)
    this.store.setError(null)
    try {
      this.permissionsStore.setPermissions(await ask())
    } catch (error) {
      this.log.warn("request-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
