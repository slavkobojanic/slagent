import { toast } from "sonner"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText } from "@/lib/format"

export class ChatDeletionPresenter {
  constructor(
    private readonly store: ChatDeletionStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleCancel = () => {
    if (this.store.busy) {
      return
    }
    this.log.action("cancel-delete-chat", { chatId: this.store.target?.id })
    this.store.setTarget(null)
  }

  handleConfirm = async () => {
    const target = this.store.target
    if (!this.store.canConfirm || target === null) {
      return
    }

    this.log.action("delete-chat", { chatId: target.id, title: target.title })
    this.store.setBusy(true)
    try {
      await this.api.deleteChat(target.id)
      // The library event removes the row. The dialog closes once the call succeeds.
      this.store.setTarget(null)
    } catch (error) {
      this.log.warn("delete-chat-failed", { chatId: target.id, error })
      toast.error(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
