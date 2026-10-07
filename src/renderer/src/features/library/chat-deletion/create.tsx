import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import { ChatDeletion } from "./chat-deletion"
import { ChatDeletionPresenter } from "./chat-deletion-presenter/chat-deletion-presenter"

export function createChatDeletion({ api, chatDeletionStore }: { api: API; chatDeletionStore: ChatDeletionStore }): ComponentType {
  const presenter = new ChatDeletionPresenter(chatDeletionStore, api)

  return observer(function ChatDeletionHost() {
    return (
      <ChatDeletion
        open={chatDeletionStore.open}
        chatTitle={chatDeletionStore.target?.title ?? ""}
        busy={chatDeletionStore.busy}
        onCancel={presenter.handleCancel}
        onConfirm={() => void presenter.handleConfirm()}
      />
    )
  })
}
