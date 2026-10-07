import { observer } from "mobx-react-lite"
import { EMPTY_PERSONALISATION } from "@shared/types"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { AppDeps } from "@/state/app-deps"
import { PersonalisationSettings } from "./personalisation-settings"
import { PersonalisationSettingsPresenter } from "./personalisation-settings-presenter/personalisation-settings-presenter"
import { PersonalisationSettingsStore } from "./personalisation-settings-store/personalisation-settings-store"

export function createPersonalisationSettings({ services, mirror, shared, tabs }: AppDeps & { tabs: SettingsStore }) {
  const store = new PersonalisationSettingsStore()
  const presenter = new PersonalisationSettingsPresenter(store, mirror.meta, services.settings, shared.overlay, tabs)
  presenter.start()

  return observer(function PersonalisationSettingsHost() {
    // Dirty and save state are checked against the saved settings the mirror reports.
    const saved = mirror.meta.meta?.personalisation ?? EMPTY_PERSONALISATION
    return (
      <PersonalisationSettings
        draft={store.draft}
        dirty={store.isDirty(saved)}
        saving={store.saving}
        canSave={store.canSave(saved)}
        error={store.error}
        onPatch={presenter.handlePatch}
        onSave={presenter.handleSave}
      />
    )
  })
}
