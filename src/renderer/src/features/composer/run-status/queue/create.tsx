import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import { MessageQueue } from "./queue"
import { QueuePresenter } from "./queue-presenter/queue-presenter"
import { QueueStore } from "./queue-store/queue-store"

export function createQueue({ api, runStore, log }: { api: API; runStore: RunStore; log: Log }): ComponentType {
  const store = new QueueStore(runStore)
  const presenter = new QueuePresenter(store, api, log)

  return observer(function QueueHost() {
    return <MessageQueue rows={store.rows} error={store.error} onModeChange={presenter.handleModeChange} onRemove={presenter.handleRemove} />
  })
}
