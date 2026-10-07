import type { QueueMode } from "@shared/types"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { QueueStore } from "@/features/composer/run-status/queue/queue-store/queue-store"
import { errorText } from "@/lib/format"

// The queue is mirrored, so failures are reported and the list is left to the event that follows a change.
export class QueuePresenter {
  constructor(
    private readonly store: QueueStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleModeChange = async (id: string, mode: QueueMode) => {
    this.log.action("set-queue-mode", { id, mode })
    this.store.setError(null)
    try {
      await this.api.setQueueMode(id, mode)
    } catch (error) {
      this.log.warn("set-queue-mode-failed", { error })
      this.store.setError(errorText(error))
    }
  }

  handleRemove = async (id: string) => {
    this.log.action("remove-queued", { id })
    this.store.setError(null)
    try {
      await this.api.removeQueued(id)
    } catch (error) {
      this.log.warn("remove-queued-failed", { error })
      this.store.setError(errorText(error))
    }
  }
}
