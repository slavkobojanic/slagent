import type { ComputerPermissions } from "@shared/types"
import type { PermissionsWizardStore } from "@/features/models/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import type { PermissionService } from "@/ipc/permission-service/permission-service"
import { errorText } from "@/lib/format"
import type { PermissionsStore } from "@/state/permissions-store"

export class PermissionsWizardPresenter {
  constructor(
    private readonly store: PermissionsWizardStore,
    private readonly permissions: Pick<PermissionsStore, "setPermissions">,
    private readonly service: Pick<PermissionService, "requestAccessibility" | "requestScreenRecording" | "openPermissionSettings">,
  ) {}

  handleAllowAccessibility = async () => {
    if (!this.store.canAllowAccessibility) {
      return
    }
    await this.request(() => this.service.requestAccessibility())
  }

  handleAllowScreenRecording = async () => {
    if (!this.store.canAllowScreenRecording) {
      return
    }
    await this.request(() => this.service.requestScreenRecording())
  }

  handleOpenSettings = async (pane: "accessibility" | "screen") => {
    try {
      await this.service.openPermissionSettings(pane)
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
      this.permissions.setPermissions(await ask())
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
