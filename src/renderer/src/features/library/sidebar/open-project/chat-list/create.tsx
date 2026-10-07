import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ChatList } from "./chat-list"
import { createChatListFooter } from "./chat-list-footer/create"
import { ChatListPresenter } from "./chat-list-presenter/chat-list-presenter"
import { ChatListStore } from "./chat-list-store/chat-list-store"
import { createChatRow } from "./chat-row/create"

export function createChatList({
  api,
  window,
  libraryStore,
  composerPort,
  commandRegistry,
  chatDeletionStore,
  chatSwitchPresenter,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  composerPort: ComposerPort
  commandRegistry: CommandRegistry
  chatDeletionStore: ChatDeletionStore
  chatSwitchPresenter: ChatSwitchPresenter
  log: Log
}): ComponentType {
  const store = new ChatListStore(libraryStore)
  const presenter = new ChatListPresenter(store, libraryStore, window, composerPort, commandRegistry, chatSwitchPresenter, log)
  presenter.start()

  const ChatRow = createChatRow({ api, window, libraryStore, chatDeletionStore, chatSwitchPresenter, log: log.child("chat-row") })
  const Footer = createChatListFooter({ chatListStore: store, chatListPresenter: presenter })

  return observer(function ChatListHost() {
    return <ChatList chats={store.visible} empty={store.empty} hasHidden={store.hiddenCount > 0} reduceMotion={store.reduceMotion} ChatRow={ChatRow} Footer={Footer} />
  })
}
