import { observer } from "mobx-react-lite"
import type { PermissionsWizardPresenter } from "@/features/permissions-wizard/permissions-wizard-presenter/permissions-wizard-presenter"
import type { PermissionsWizardStore } from "@/features/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import { AccessibilityStep } from "./accessibility-step"

export function createAccessibilityStep({
  permissionsWizardStore,
  permissionsWizardPresenter,
}: {
  permissionsWizardStore: PermissionsWizardStore
  permissionsWizardPresenter: PermissionsWizardPresenter
}) {
  const openSettings = () => permissionsWizardPresenter.handleOpenSettings("accessibility")

  return observer(function AccessibilityStepHost() {
    return (
      <AccessibilityStep
        pane={permissionsWizardStore.accessibilityPane}
        error={permissionsWizardStore.error}
        canAllow={permissionsWizardStore.canAllowAccessibility}
        onOpenSettings={openSettings}
        onAllow={permissionsWizardPresenter.handleAllowAccessibility}
      />
    )
  })
}
