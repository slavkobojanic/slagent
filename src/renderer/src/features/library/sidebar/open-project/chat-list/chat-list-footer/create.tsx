import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatListPresenter } from "@/features/library/sidebar/open-project/chat-list/chat-list-presenter/chat-list-presenter"
import type { ChatListStore } from "@/features/library/sidebar/open-project/chat-list/chat-list-store/chat-list-store"
import { ChatListFooter } from "./chat-list-footer"

export function createChatListFooter({ chatListStore, chatListPresenter }: { chatListStore: ChatListStore; chatListPresenter: ChatListPresenter }): ComponentType {
  return observer(function ChatListFooterHost() {
    return (
      <ChatListFooter
        hiddenCount={chatListStore.hiddenCount}
        canShowLess={chatListStore.canShowLess}
        onShowAll={chatListPresenter.handleShowAll}
        onShowLess={chatListPresenter.handleShowLess}
      />
    )
  })
}
