import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AppDeps } from "@/state/app-deps"
import { QueuePresenter } from "@/features/run-status/queue/queue-presenter/queue-presenter"
import { QueueStore } from "@/features/run-status/queue/queue-store/queue-store"
import { MessageQueue } from "./queue"

// Owning: called once at boot. The queue's commands go through the chat service.
export function createQueue({ services, mirror }: Pick<AppDeps, "services" | "mirror">): ComponentType {
  const store = new QueueStore(mirror.run)
  const presenter = new QueuePresenter(store, services.chat)

  return observer(function QueueHost() {
    return (
      <MessageQueue
        rows={store.rows}
        error={store.error}
        onModeChange={presenter.handleModeChange}
        onRemove={presenter.handleRemove}
      />
    )
  })
}
