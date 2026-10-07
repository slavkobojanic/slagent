import { observer } from "mobx-react-lite"
import type { ModelsPresenter } from "@/features/models/models-presenter/models-presenter"
import type { ModelsStore } from "@/features/models/models-store/models-store"
import { ModelList } from "./model-list"

export function createModelList({ modelsStore, modelsPresenter }: { modelsStore: ModelsStore; modelsPresenter: ModelsPresenter }) {
  return observer(function ModelListHost() {
    return (
      <ModelList sections={modelsStore.groups.sections} canSelect={modelsStore.canSelect} onSelect={modelsPresenter.handleSelect} />
    )
  })
}
