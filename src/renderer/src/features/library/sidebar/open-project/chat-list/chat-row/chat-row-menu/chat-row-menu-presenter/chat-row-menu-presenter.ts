import { toast } from "sonner"
import type { ChatSummary } from "@shared/types"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import { errorText, formatTranscript } from "@/lib/format"

export class ChatRowMenuPresenter {
  constructor(
    private readonly store: ChatRowMenuStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly chatRenameStore: ChatRenameStore,
    private readonly chatDeletionStore: ChatDeletionStore,
  ) {}

  handleOpenChange = (chat: ChatSummary, open: boolean) => {
    if (open) {
      this.store.setChatId(chat.id)
      return
    }
    if (!this.store.isOpen(chat.id)) {
      return
    }
    this.store.setChatId(null)
  }

  handlePin = (chat: ChatSummary) => toastFailure(() => this.api.pinChat(chat.id, !chat.pinned))

  handleRename = (chat: ChatSummary) => {
    this.chatRenameStore.startRename(chat.id, chat.title)
  }

  handleDelete = (chat: ChatSummary) => {
    this.chatDeletionStore.setTarget(chat)
  }

  handleCopy = async (chat: ChatSummary) => {
    try {
      const stored = await this.api.readTranscript(chat.id)
      const text = formatTranscript(chat.title, stored)
      if (text === "") {
        toast.error("This chat is empty.")
        return
      }
      await this.window.navigator.clipboard.writeText(text)
      toast.success("Transcript copied")
    } catch (error) {
      toast.error(errorText(error))
    }
  }
}
