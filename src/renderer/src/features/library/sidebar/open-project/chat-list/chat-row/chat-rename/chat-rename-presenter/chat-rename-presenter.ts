import type { ChatSummary } from "@shared/types"
import { projectOfChat } from "@/features/library/library-utils"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatRenamePresenter {
  constructor(
    private readonly store: ChatRenameStore,
    private readonly api: API,
    private readonly libraryStore: LibraryStore,
    private readonly log: Log,
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
    const projectId = projectOfChat(this.libraryStore.library, chat.id)
    this.log.action("rename-chat", { chatId: chat.id, projectId, title })
    void toastFailure(() => this.api.renameChat(chat.id, title, projectId))
  }

  handleCancel = () => {
    this.log.action("cancel-rename")
    this.store.endRename()
  }
}
