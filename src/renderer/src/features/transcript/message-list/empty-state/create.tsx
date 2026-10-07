import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { EmptyState } from "./empty-state"
import { EmptyStatePresenter } from "./empty-state-presenter/empty-state-presenter"

export function createEmptyState({ api, metaStore, overlayStore }: { api: API; metaStore: MetaStore; overlayStore: OverlayStore }): ComponentType {
  const presenter = new EmptyStatePresenter(api, overlayStore)

  return observer(function EmptyStateHost() {
    return (
      <EmptyState
        configured={metaStore.configured}
        cwd={metaStore.meta?.cwd ?? ""}
        onConnect={presenter.openSettings}
        onChoose={presenter.chooseFolder}
      />
    )
  })
}
