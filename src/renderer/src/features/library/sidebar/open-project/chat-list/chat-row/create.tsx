import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSummary } from "@shared/types"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { ChatRow } from "./chat-row"
import { createChatRename } from "./chat-rename/create"
import { ChatRenameStore } from "./chat-rename/chat-rename-store/chat-rename-store"
import { createChatRowMenu } from "./chat-row-menu/create"
import { ChatRowMenuStore } from "./chat-row-menu/chat-row-menu-store/chat-row-menu-store"
import { ChatRowPresenter } from "./chat-row-presenter/chat-row-presenter"
import { ChatRowStore } from "./chat-row-store/chat-row-store"

export function createChatRow({
  api,
  window,
  libraryStore,
  chatDeletionStore,
  chatSwitchPresenter,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  chatDeletionStore: ChatDeletionStore
  chatSwitchPresenter: ChatSwitchPresenter
  log: Log
}): ComponentType<{ chat: ChatSummary }> {
  const store = new ChatRowStore(libraryStore)
  const chatRenameStore = new ChatRenameStore()
  const chatRowMenuStore = new ChatRowMenuStore()
  const presenter = new ChatRowPresenter(store, libraryStore, window, chatRowMenuStore, chatSwitchPresenter, log)
  presenter.start()

  const Rename = createChatRename({ api, libraryStore, chatRenameStore, log: log.child("chat-rename") })
  const Menu = createChatRowMenu({ api, window, libraryStore, chatRowMenuStore, chatRenameStore, chatDeletionStore, log: log.child("chat-row-menu") })

  return observer(function ChatRowHost({ chat }: { chat: ChatSummary }) {
    return (
      <ChatRow
        chat={chat}
        status={store.statusOf(chat)}
        active={store.isActive(chat)}
        renaming={chatRenameStore.isRenaming(chat.id)}
        onOpen={presenter.handleOpen}
        onContextMenu={presenter.handleContextMenu}
        Menu={Menu}
        Rename={Rename}
      />
    )
  })
}
