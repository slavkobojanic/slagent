import { toast } from "sonner"
import type { ChatSummary } from "@shared/types"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText, formatTranscript } from "@/lib/format"

export class ChatRowMenuPresenter {
  constructor(
    private readonly store: ChatRowMenuStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly chatRenameStore: ChatRenameStore,
    private readonly chatDeletionStore: ChatDeletionStore,
    private readonly log: Log,
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

  handlePin = (chat: ChatSummary) => {
    this.log.action(chat.pinned ? "unpin-chat" : "pin-chat", { chatId: chat.id })
    return toastFailure(() => this.api.pinChat(chat.id, !chat.pinned))
  }

  handleRename = (chat: ChatSummary) => {
    this.log.action("start-rename", { chatId: chat.id })
    this.chatRenameStore.startRename(chat.id, chat.title)
  }

  handleDelete = (chat: ChatSummary) => {
    this.log.action("ask-delete-chat", { chatId: chat.id, title: chat.title })
    this.chatDeletionStore.setTarget(chat)
  }

  handleCopy = async (chat: ChatSummary) => {
    this.log.action("copy-transcript", { chatId: chat.id })
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
      this.log.warn("copy-transcript-failed", { chatId: chat.id, error })
      toast.error(errorText(error))
    }
  }
}
