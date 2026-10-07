import { observer } from "mobx-react-lite"
import type { OpenRouterKeyPresenter } from "@/features/settings/openrouter-key/openrouter-key-presenter/openrouter-key-presenter"
import { openRouterStatusOf } from "@/features/settings/openrouter-key/openrouter-key-status"
import type { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { KeyField } from "./key-field"

export function createKeyField({
  metaStore,
  openRouterKeyStore,
  openRouterKeyPresenter,
}: {
  metaStore: MetaStore
  openRouterKeyStore: OpenRouterKeyStore
  openRouterKeyPresenter: OpenRouterKeyPresenter
}) {
  return observer(function KeyFieldHost() {
    return (
      <KeyField
        apiKey={openRouterKeyStore.apiKey}
        visible={openRouterKeyStore.visible}
        oauth={openRouterStatusOf(metaStore.meta).type === "oauth"}
        onApiKeyChange={openRouterKeyPresenter.handleApiKeyChange}
        onToggleVisible={openRouterKeyPresenter.handleToggleVisible}
      />
    )
  })
}
