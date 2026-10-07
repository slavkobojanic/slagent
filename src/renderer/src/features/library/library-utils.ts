import { DONE_WINDOW_MS, type ChatStatus, type ChatSummary, type LibraryState, type ProjectSummary } from "@shared/types"

// Chats the sidebar shows before "Show N more".
export const CHAT_LIMIT = 10

// Where the user is: the open project and chat. A null chat is a draft.
export type Place = { projectId: string | null; chatId: string | null }

// The place plus the chats that existed there. Lets a draft that turns into a new chat be told apart from opening an existing one.
export type LibraryContext = Place & { chatIds: ReadonlySet<string> }

export function libraryContext(library: LibraryState): LibraryContext {
  return { projectId: library.openProjectId, chatId: library.openChatId, chatIds: new Set(library.chats.map((chat) => chat.id)) }
}

export function samePlace(left: Place, right: Place): boolean {
  if (left.projectId !== right.projectId) {
    return false
  }
  return left.chatId === right.chatId
}

// A draft in the same project that receives its first message becomes a chat. Opening an existing chat is not this.
export function isDraftBecomingChat(previous: LibraryContext, next: Place): boolean {
  if (next.projectId !== previous.projectId || previous.chatId !== null || next.chatId === null) {
    return false
  }
  return !previous.chatIds.has(next.chatId)
}

export function openProjectOf(library: LibraryState): ProjectSummary | null {
  if (library.openProjectId === null) {
    return null
  }
  return library.projects.find((project) => project.id === library.openProjectId) ?? null
}

// Pinned chats first, newest pin first. Then the rest, most recently updated first.
export function orderedChats(chats: ChatSummary[]): ChatSummary[] {
  const pinned = chats.filter((chat) => chat.pinned).sort((left, right) => right.pinnedAt - left.pinnedAt)
  const rest = chats.filter((chat) => !chat.pinned).sort((left, right) => right.updatedAt - left.updatedAt)
  return [...pinned, ...rest]
}

export function visibleChats(chats: ChatSummary[], showAll: boolean): ChatSummary[] {
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

// Pinned projects other than the open one, newest pin first.
export function pinnedProjects(projects: ProjectSummary[], openProjectId: string | null): ProjectSummary[] {
  return projects.filter((project) => project.pinned && project.id !== openProjectId).sort((left, right) => right.pinnedAt - left.pinnedAt)
}

// "done" shows for DONE_WINDOW_MS after the chat finished, then falls back to idle. The clock is passed in so the view stays pure.
export function chatDisplayStatus(chat: ChatSummary, now: number): ChatStatus {
  if (chat.status === "done" && chat.finishedAt !== null && now >= chat.finishedAt + DONE_WINDOW_MS) {
    return "idle"
  }
  return chat.status
}

// The earliest moment after now when a done chat falls back to idle, or null when none is pending.
export function nextDoneExpiry(chats: ChatSummary[], now: number): number | null {
  let next: number | null = null
  for (const chat of chats) {
    if (chat.status !== "done" || chat.finishedAt === null) {
      continue
    }
    const expiry = chat.finishedAt + DONE_WINDOW_MS
    if (expiry <= now) {
      continue
    }
    if (next === null || expiry < next) {
      next = expiry
    }
  }
  return next
}
