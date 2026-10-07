import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { ModelButton } from "./model-button"
import { ModelButtonPresenter } from "./model-button-presenter/model-button-presenter"

export function createModelButton({
  metaStore,
  runStore,
  overlayStore,
}: {
  metaStore: MetaStore
  runStore: RunStore
  overlayStore: OverlayStore
}): ComponentType {
  const presenter = new ModelButtonPresenter(overlayStore)

  return observer(function ModelButtonHost() {
    const meta = metaStore.meta
    return (
      <ModelButton
        name={meta?.modelName ?? "Choose model"}
        provider={meta?.modelProvider ?? null}
        configured={metaStore.configured}
        disabled={!metaStore.ready || runStore.streaming}
        onOpen={presenter.open}
      />
    )
  })
}
