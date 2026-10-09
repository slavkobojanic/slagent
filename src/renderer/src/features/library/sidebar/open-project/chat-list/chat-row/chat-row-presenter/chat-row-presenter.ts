import type { ChatSummary } from "@shared/types"
import { projectOfChat } from "@/features/library/library-utils"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class ChatRowPresenter {
  constructor(
    private readonly libraryStore: LibraryStore,
    private readonly chatRowMenuStore: ChatRowMenuStore,
    private readonly chatSwitchPresenter: ChatSwitchPresenter,
    private readonly log: Log,
  ) {}

  // The sidebar can list chats of projects that are not open, so the chat's own project goes along.
  handleOpen = (chat: ChatSummary) => {
    const projectId = projectOfChat(this.libraryStore.library, chat.id)
    this.log.action("open-chat", { chatId: chat.id, projectId, title: chat.title })
    return toastFailure(() => this.chatSwitchPresenter.openChat(chat.id, projectId))
  }

  handleContextMenu = (chat: ChatSummary) => {
    this.log.action("open-chat-menu", { chatId: chat.id })
    this.chatRowMenuStore.setChatId(chat.id)
  }
}
