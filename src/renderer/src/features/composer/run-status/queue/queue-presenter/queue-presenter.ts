import type { QueueMode } from "@shared/types"
import type { API } from "@/ipc/api"
import type { QueueStore } from "@/features/composer/run-status/queue/queue-store/queue-store"
import { errorText } from "@/lib/format"

// The queue is mirrored, so failures are reported and the list is left to the event that follows a change.
export class QueuePresenter {
  constructor(
    private readonly store: QueueStore,
    private readonly api: API,
  ) {}

  handleModeChange = async (id: string, mode: QueueMode) => {
    this.store.setError(null)
    try {
      await this.api.setQueueMode(id, mode)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  handleRemove = async (id: string) => {
    this.store.setError(null)
    try {
      await this.api.removeQueued(id)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }
}
