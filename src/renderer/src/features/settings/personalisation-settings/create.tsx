import { observer } from "mobx-react-lite"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { PersonalisationSettings } from "./personalisation-settings"
import { PersonalisationSettingsPresenter } from "./personalisation-settings-presenter/personalisation-settings-presenter"
import { PersonalisationSettingsStore } from "./personalisation-settings-store/personalisation-settings-store"
import { createSaveBar } from "./save-bar/create"

export function createPersonalisationSettings({
  api,
  metaStore,
  overlayStore,
  settingsStore,
  log,
}: {
  api: API
  metaStore: MetaStore
  overlayStore: OverlayStore
  settingsStore: SettingsStore
  log: Log
}) {
  const personalisationSettingsStore = new PersonalisationSettingsStore()
  const personalisationSettingsPresenter = new PersonalisationSettingsPresenter(
    personalisationSettingsStore,
    api,
    metaStore,
    overlayStore,
    settingsStore,
    log,
  )
  personalisationSettingsPresenter.start()

  const SaveBar = createSaveBar({ metaStore, personalisationSettingsStore, personalisationSettingsPresenter })

  return observer(function PersonalisationSettingsHost() {
    return (
      <PersonalisationSettings
        draft={personalisationSettingsStore.draft}
        onPatch={personalisationSettingsPresenter.handlePatch}
        onPickFiles={personalisationSettingsPresenter.handlePickFiles}
        onRemoveFile={personalisationSettingsPresenter.handleRemoveFile}
        SaveBar={SaveBar}
      />
    )
  })
}
