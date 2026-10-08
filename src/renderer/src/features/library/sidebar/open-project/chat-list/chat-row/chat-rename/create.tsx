import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSummary } from "@shared/types"
import type { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { ChatRename } from "./chat-rename"
import { ChatRenamePresenter } from "./chat-rename-presenter/chat-rename-presenter"

export function createChatRename({
  api,
  libraryStore,
  chatRenameStore,
  log,
}: {
  api: API
  libraryStore: LibraryStore
  chatRenameStore: ChatRenameStore
  log: Log
}): ComponentType<{ chat: ChatSummary }> {
  const presenter = new ChatRenamePresenter(chatRenameStore, api, libraryStore, log)

  return observer(function ChatRenameHost({ chat }: { chat: ChatSummary }) {
    return (
      <ChatRename
        chat={chat}
        draft={chatRenameStore.draft}
        onDraftChange={presenter.handleDraftChange}
        onSave={presenter.handleSave}
        onCancel={presenter.handleCancel}
      />
    )
  })
}
