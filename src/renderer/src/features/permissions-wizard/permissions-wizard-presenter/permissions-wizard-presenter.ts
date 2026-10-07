import type { ComputerPermissions } from "@shared/types"
import type { PermissionsWizardStore } from "@/features/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

export class PermissionsWizardPresenter {
  constructor(
    private readonly store: PermissionsWizardStore,
    private readonly api: API,
    private readonly permissionsStore: PermissionsStore,
  ) {}

  handleAllowAccessibility = async () => {
    if (!this.store.canAllowAccessibility) {
      return
    }
    await this.request(() => this.api.requestAccessibility())
  }

  handleAllowScreenRecording = async () => {
    if (!this.store.canAllowScreenRecording) {
      return
    }
    await this.request(() => this.api.requestScreenRecording())
  }

  handleOpenSettings = async (pane: "accessibility" | "screen") => {
    try {
      await this.api.openPermissionSettings(pane)
    } catch (error) {
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
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
