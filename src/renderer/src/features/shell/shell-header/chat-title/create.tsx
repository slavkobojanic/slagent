import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { ChatTitle } from "./chat-title"
import { openChatOf } from "./chat-title-utils"

export function createChatTitle({ libraryStore }: { libraryStore: LibraryStore }): ComponentType {
  return observer(function ChatTitleHost() {
    return <ChatTitle title={openChatOf(libraryStore.library)?.title ?? null} />
  })
}
