import { observer } from "mobx-react-lite"
import { toast } from "sonner"
import { ModelDialog } from "@/features/models/model-dialog/model-dialog"
import { ModelDialogPresenter } from "@/features/models/model-dialog/model-dialog-presenter/model-dialog-presenter"
import { ModelDialogStore } from "@/features/models/model-dialog/model-dialog-store/model-dialog-store"
import { PermissionsWizard } from "@/features/models/permissions-wizard/permissions-wizard"
import { PermissionsWizardPresenter } from "@/features/models/permissions-wizard/permissions-wizard-presenter/permissions-wizard-presenter"
import { PermissionsWizardStore } from "@/features/models/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import type { AppDeps } from "@/state/app-deps"
import { PermissionsPresenter } from "@/state/permissions-presenter"
import type { ModelsSlots } from "@/state/slots"

// Owning create: called once at boot. It builds the model dialog and the permissions wizard,
// then starts what runs for the life of the app: the "Change model" command and the permissions
// read that unlocks the window.
export function createModels({ services, env, mirror, shared }: AppDeps): ModelsSlots {
  const dialogStore = new ModelDialogStore(mirror.meta, mirror.run)
  const dialog = new ModelDialogPresenter(
    dialogStore,
    shared.overlay,
    services.settings,
    shared.composer,
    shared.commands,
    (message) => toast.message(message),
  )

  const wizardStore = new PermissionsWizardStore(shared.permissions, services.app.systemVersion)
  const wizard = new PermissionsWizardPresenter(wizardStore, shared.permissions, services.permissions)
  const permissions = new PermissionsPresenter(shared.permissions, services.permissions, services.app.platform, env)

  dialog.start()
  permissions.start()

  const ModelDialogHost = observer(function ModelDialogHost() {
    return (
      <ModelDialog
        open={shared.overlay.modelOpen}
        query={dialogStore.query}
        canSelect={dialogStore.canSelect}
        sections={dialogStore.groups.sections}
        overflowNotice={dialogStore.groups.overflowNotice}
        error={dialogStore.error}
        onOpenChange={dialog.handleOpenChange}
        onQueryChange={dialog.handleQueryChange}
        onSelect={dialog.handleSelect}
      />
    )
  })

  const PermissionsWizardHost = observer(function PermissionsWizardHost() {
    return (
      <PermissionsWizard
        open={wizardStore.open}
        step={wizardStore.step}
        accessibilityPane={wizardStore.accessibilityPane}
        screenPane={wizardStore.screenPane}
        error={wizardStore.error}
        canAllowAccessibility={wizardStore.canAllowAccessibility}
        canAllowScreenRecording={wizardStore.canAllowScreenRecording}
        onOpenSettings={wizard.handleOpenSettings}
        onAllowAccessibility={wizard.handleAllowAccessibility}
        onAllowScreenRecording={wizard.handleAllowScreenRecording}
      />
    )
  })

  return { ModelDialog: ModelDialogHost, PermissionsWizard: PermissionsWizardHost }
}
