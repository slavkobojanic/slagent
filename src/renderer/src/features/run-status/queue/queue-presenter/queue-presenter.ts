import type { QueueMode } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { QueueStore } from "@/features/run-status/queue/queue-store/queue-store"
import { errorText } from "@/lib/format"

// Switches a queued message between follow-up and steer, or removes it. The queue is mirrored,
// so the presenter reports failures and leaves the list to the event that follows a change.
export class QueuePresenter {
  constructor(
    private readonly store: QueueStore,
    private readonly chat: Pick<ChatService, "setQueueMode" | "removeQueued">,
  ) {}

  handleModeChange = async (id: string, mode: QueueMode) => {
    this.store.setError(null)
    try {
      await this.chat.setQueueMode(id, mode)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  handleRemove = async (id: string) => {
    this.store.setError(null)
    try {
      await this.chat.removeQueued(id)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }
}
