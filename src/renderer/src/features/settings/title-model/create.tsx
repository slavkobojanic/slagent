import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { TitleModel } from "./title-model"
import { TitleModelPresenter } from "./title-model-presenter/title-model-presenter"
import { TitleModelStore } from "./title-model-store/title-model-store"

export function createTitleModel({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }) {
  const titleModelStore = new TitleModelStore()
  const titleModelPresenter = new TitleModelPresenter(titleModelStore, api, log)

  return observer(function TitleModelHost() {
    return (
      <TitleModel
        models={metaStore.meta?.titleModels ?? []}
        value={metaStore.meta?.titleModelId ?? null}
        error={titleModelStore.error}
        onValueChange={titleModelPresenter.handleChange}
      />
    )
  })
}
