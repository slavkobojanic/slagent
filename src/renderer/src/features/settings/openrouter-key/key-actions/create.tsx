import { observer } from "mobx-react-lite"
import type { OpenRouterKeyPresenter } from "@/features/settings/openrouter-key/openrouter-key-presenter/openrouter-key-presenter"
import { canRemoveSavedKey, openRouterStatusOf } from "@/features/settings/openrouter-key/openrouter-key-status"
import type { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { KeyActions } from "./key-actions"

export function createKeyActions({
  metaStore,
  openRouterKeyStore,
  openRouterKeyPresenter,
}: {
  metaStore: MetaStore
  openRouterKeyStore: OpenRouterKeyStore
  openRouterKeyPresenter: OpenRouterKeyPresenter
}) {
  return observer(function KeyActionsHost() {
    const status = openRouterStatusOf(metaStore.meta)
    return (
      <KeyActions
        canSave={openRouterKeyStore.canSave}
        saving={openRouterKeyStore.saving}
        canRemove={canRemoveSavedKey(status)}
        removing={openRouterKeyStore.removing}
        oauth={status.type === "oauth"}
        onCreateKey={openRouterKeyPresenter.handleCreateKey}
        onRemove={openRouterKeyPresenter.handleRemove}
      />
    )
  })
}
