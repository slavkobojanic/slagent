// Chats the sidebar shows before "Show N more".
export const CHAT_LIMIT = 10

export function visibleChats<T>(chats: T[], showAll: boolean): T[] {
  if (showAll) {
    return chats
  }
  return chats.slice(0, CHAT_LIMIT)
}

// "Show less" appears only once the full list is showing and it is longer than the limit.
export function canShowLess(total: number, showAll: boolean): boolean {
  if (!showAll) {
    return false
  }
  return total > CHAT_LIMIT
}
