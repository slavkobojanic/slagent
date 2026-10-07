import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import { MessageQueue } from "./queue"
import { QueuePresenter } from "./queue-presenter/queue-presenter"
import { QueueStore } from "./queue-store/queue-store"

export function createQueue({ api, runStore }: { api: API; runStore: RunStore }): ComponentType {
  const store = new QueueStore(runStore)
  const presenter = new QueuePresenter(store, api)

  return observer(function QueueHost() {
    return <MessageQueue rows={store.rows} error={store.error} onModeChange={presenter.handleModeChange} onRemove={presenter.handleRemove} />
  })
}
