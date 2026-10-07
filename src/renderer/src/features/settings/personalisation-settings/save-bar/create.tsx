import { observer } from "mobx-react-lite"
import { EMPTY_PERSONALISATION } from "@shared/types"
import type { PersonalisationSettingsPresenter } from "@/features/settings/personalisation-settings/personalisation-settings-presenter/personalisation-settings-presenter"
import type { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { SaveBar } from "./save-bar"

export function createSaveBar({
  metaStore,
  personalisationSettingsStore,
  personalisationSettingsPresenter,
}: {
  metaStore: MetaStore
  personalisationSettingsStore: PersonalisationSettingsStore
  personalisationSettingsPresenter: PersonalisationSettingsPresenter
}) {
  return observer(function SaveBarHost() {
    const saved = metaStore.meta?.personalisation ?? EMPTY_PERSONALISATION
    return (
      <SaveBar
        dirty={personalisationSettingsStore.isDirty(saved)}
        saving={personalisationSettingsStore.saving}
        canSave={personalisationSettingsStore.canSave(saved)}
        error={personalisationSettingsStore.error}
        onSave={personalisationSettingsPresenter.handleSave}
      />
    )
  })
}
