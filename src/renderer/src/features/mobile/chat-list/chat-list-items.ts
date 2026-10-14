import type { ChatStatus, ChatSummary } from "@shared/types"

export type ChatListItem = {
  chat: ChatSummary
  projectId: string
  status: ChatStatus
}

export type ChatGroup = {
  id: string
  name: string
  // Where "New chat" in this group starts one; null starts a chat without a folder.
  newChatProjectId: string | null
  items: ChatListItem[]
}

// A group as the list shows it: `items` holds only the chats before "Show N more",
// the same cap the desktop sidebar applies.
export type ChatGroupView = ChatGroup & {
  hiddenCount: number
  showAll: boolean
  canShowLess: boolean
}
