import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import { toast } from "sonner"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createModelList } from "./model-list/create"
import { Models } from "./models"
import { ModelsPresenter } from "./models-presenter/models-presenter"
import { ModelsStore } from "./models-store/models-store"

export function createModels({
  api,
  metaStore,
  runStore,
  overlayStore,
  commandRegistry,
  composerPort,
}: {
  api: API
  metaStore: MetaStore
  runStore: RunStore
  overlayStore: OverlayStore
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
}): ComponentType {
  const modelsStore = new ModelsStore(metaStore, runStore)
  const modelsPresenter = new ModelsPresenter(modelsStore, api, overlayStore, composerPort, commandRegistry, (message) =>
    toast.message(message),
  )
  modelsPresenter.start()

  const ModelList = createModelList({ modelsStore, modelsPresenter })

  return observer(function ModelsHost() {
    return (
      <Models
        open={overlayStore.modelOpen}
        query={modelsStore.query}
        overflowNotice={modelsStore.groups.overflowNotice}
        error={modelsStore.error}
        onOpenChange={modelsPresenter.handleOpenChange}
        onQueryChange={modelsPresenter.handleQueryChange}
        ModelList={ModelList}
      />
    )
  })
}
