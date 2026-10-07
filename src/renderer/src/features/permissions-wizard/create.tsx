import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import { PermissionsPresenter } from "@/state/permissions/permissions-presenter/permissions-presenter"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"
import { createAccessibilityStep } from "./accessibility-step/create"
import { PermissionsWizard } from "./permissions-wizard"
import { PermissionsWizardPresenter } from "./permissions-wizard-presenter/permissions-wizard-presenter"
import { PermissionsWizardStore } from "./permissions-wizard-store/permissions-wizard-store"
import { createScreenStep } from "./screen-step/create"

export function createPermissionsWizard({
  api,
  window,
  permissionsStore,
}: {
  api: API
  window: Window
  permissionsStore: PermissionsStore
}): ComponentType {
  const permissionsWizardStore = new PermissionsWizardStore(permissionsStore, api.systemVersion)
  const permissionsWizardPresenter = new PermissionsWizardPresenter(permissionsWizardStore, api, permissionsStore)
  const permissionsPresenter = new PermissionsPresenter(permissionsStore, api, api.platform, window)
  permissionsPresenter.start()

  const AccessibilityStep = createAccessibilityStep({ permissionsWizardStore, permissionsWizardPresenter })
  const ScreenStep = createScreenStep({ permissionsWizardStore, permissionsWizardPresenter })

  return observer(function PermissionsWizardHost() {
    return (
      <PermissionsWizard
        open={permissionsWizardStore.open}
        step={permissionsWizardStore.step}
        AccessibilityStep={AccessibilityStep}
        ScreenStep={ScreenStep}
      />
    )
  })
}
