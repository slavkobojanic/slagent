import { observer } from "mobx-react-lite"
import type { PermissionsWizardPresenter } from "@/features/permissions-wizard/permissions-wizard-presenter/permissions-wizard-presenter"
import type { PermissionsWizardStore } from "@/features/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import { ScreenStep } from "./screen-step"

export function createScreenStep({
  permissionsWizardStore,
  permissionsWizardPresenter,
}: {
  permissionsWizardStore: PermissionsWizardStore
  permissionsWizardPresenter: PermissionsWizardPresenter
}) {
  const openSettings = () => permissionsWizardPresenter.handleOpenSettings("screen")

  return observer(function ScreenStepHost() {
    return (
      <ScreenStep
        pane={permissionsWizardStore.screenPane}
        error={permissionsWizardStore.error}
        canAllow={permissionsWizardStore.canAllowScreenRecording}
        onOpenSettings={openSettings}
        onAllow={permissionsWizardPresenter.handleAllowScreenRecording}
      />
    )
  })
}
