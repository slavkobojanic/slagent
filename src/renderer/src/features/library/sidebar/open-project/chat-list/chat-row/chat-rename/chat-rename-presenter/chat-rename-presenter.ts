import type { ChatSummary } from "@shared/types"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"

export class ChatRenamePresenter {
  constructor(
    private readonly store: ChatRenameStore,
    private readonly api: API,
  ) {}

  handleDraftChange = (value: string) => {
    this.store.setDraft(value)
  }

  // Submit and blur both save, and Escape unmounts the field, which blurs it. Only the row still being
  // renamed saves, so each of those lands once. An empty title cancels the rename.
  handleSave = (chat: ChatSummary) => {
    if (!this.store.isRenaming(chat.id)) {
      return
    }
    const title = this.store.draft.trim()
    this.store.endRename()
    if (title === "") {
      return
    }
    void toastFailure(() => this.api.renameChat(chat.id, title))
  }

  handleCancel = () => {
    this.store.endRename()
  }
}
