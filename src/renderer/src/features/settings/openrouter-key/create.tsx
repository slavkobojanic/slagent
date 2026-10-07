import { observer } from "mobx-react-lite"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createKeyActions } from "./key-actions/create"
import { createKeyField } from "./key-field/create"
import { OpenRouterKey } from "./openrouter-key"
import { OpenRouterKeyPresenter } from "./openrouter-key-presenter/openrouter-key-presenter"
import { authFilePath, openRouterStatusOf } from "./openrouter-key-status"
import { OpenRouterKeyStore } from "./openrouter-key-store/openrouter-key-store"

export function createOpenRouterKey({
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
  const openRouterKeyStore = new OpenRouterKeyStore()
  const openRouterKeyPresenter = new OpenRouterKeyPresenter(openRouterKeyStore, api, overlayStore, settingsStore, log)
  openRouterKeyPresenter.start()

  const KeyField = createKeyField({ metaStore, openRouterKeyStore, openRouterKeyPresenter })
  const KeyActions = createKeyActions({ metaStore, openRouterKeyStore, openRouterKeyPresenter })

  return observer(function OpenRouterKeyHost() {
    return (
      <OpenRouterKey
        status={openRouterStatusOf(metaStore.meta)}
        authFile={authFilePath(metaStore.meta?.agentDir)}
        error={openRouterKeyStore.error}
        onSave={openRouterKeyPresenter.handleSave}
        KeyField={KeyField}
        KeyActions={KeyActions}
      />
    )
  })
}
