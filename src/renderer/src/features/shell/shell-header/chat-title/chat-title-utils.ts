import type { ChatSummary, LibraryState } from "@shared/types"

export function openChatOf(library: LibraryState): ChatSummary | null {
  if (library.openChatId === null) {
    return null
  }
  return library.chats.find((chat) => chat.id === library.openChatId) ?? null
}
