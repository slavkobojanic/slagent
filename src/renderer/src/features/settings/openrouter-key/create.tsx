import { observer } from "mobx-react-lite"
import type { OpenRouterStatus } from "@shared/types"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { AppDeps } from "@/state/app-deps"
import { OpenRouterKey } from "./openrouter-key"
import { OpenRouterKeyPresenter } from "./openrouter-key-presenter/openrouter-key-presenter"
import { OpenRouterKeyStore } from "./openrouter-key-store/openrouter-key-store"
import { authFilePath, canRemoveSavedKey } from "./openrouter-key-status"

const EMPTY_STATUS: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

export function createOpenRouterKey({ services, mirror, shared, tabs }: AppDeps & { tabs: SettingsStore }) {
  const store = new OpenRouterKeyStore()
  const presenter = new OpenRouterKeyPresenter(store, services.settings, services.app, shared.overlay, tabs)
  presenter.start()

  return observer(function OpenRouterKeyHost() {
    // The configured state, the environment key and the removable key all come from the mirror.
    const status = mirror.meta.meta?.openRouter ?? EMPTY_STATUS
    return (
      <OpenRouterKey
        status={status}
        authFile={authFilePath(mirror.meta.meta?.agentDir)}
        apiKey={store.apiKey}
        visible={store.visible}
        saving={store.saving}
        removing={store.removing}
        canSave={store.canSave}
        canRemove={canRemoveSavedKey(status)}
        error={store.error}
        onApiKeyChange={presenter.handleApiKeyChange}
        onToggleVisible={presenter.handleToggleVisible}
        onCreateKey={presenter.handleCreateKey}
        onSave={presenter.handleSave}
        onRemove={presenter.handleRemove}
      />
    )
  })
}
