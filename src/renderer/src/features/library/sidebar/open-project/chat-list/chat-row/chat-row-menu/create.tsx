import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSummary } from "@shared/types"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import type { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { ChatRowMenu } from "./chat-row-menu"
import { ChatRowMenuPresenter } from "./chat-row-menu-presenter/chat-row-menu-presenter"

export function createChatRowMenu({
  api,
  window,
  chatRowMenuStore,
  chatRenameStore,
  chatDeletionStore,
  log,
}: {
  api: API
  window: Window
  chatRowMenuStore: ChatRowMenuStore
  chatRenameStore: ChatRenameStore
  chatDeletionStore: ChatDeletionStore
  log: Log
}): ComponentType<{ chat: ChatSummary }> {
  const presenter = new ChatRowMenuPresenter(chatRowMenuStore, api, window, chatRenameStore, chatDeletionStore, log)

  return observer(function ChatRowMenuHost({ chat }: { chat: ChatSummary }) {
    return (
      <ChatRowMenu
        chat={chat}
        open={chatRowMenuStore.isOpen(chat.id)}
        onOpenChange={presenter.handleOpenChange}
        onPin={presenter.handlePin}
        onRename={presenter.handleRename}
        onCopy={presenter.handleCopy}
        onDelete={presenter.handleDelete}
      />
    )
  })
}
