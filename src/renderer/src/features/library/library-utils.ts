import type { ChatSummary, LibraryState } from "@shared/types"

// Where the user is: the open project and chat. A null chat is a draft.
export type Place = { projectId: string | null; chatId: string | null }

// The chat ids let a draft that turns into a new chat be told apart from opening an existing one.
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

export function isDraftBecomingChat(previous: LibraryContext, next: Place): boolean {
  if (next.projectId !== previous.projectId || previous.chatId !== null || next.chatId === null) {
    return false
  }
  return !previous.chatIds.has(next.chatId)
}

// The chat with the id, wherever it lives: the open project's `chats` or another project's list in
// `chatsByProject`.
export function chatOf(library: LibraryState, chatId: string): ChatSummary | undefined {
  return library.chats.find((chat) => chat.id === chatId) ?? Object.values(library.chatsByProject).flat().find((chat) => chat.id === chatId)
}

// The project a chat belongs to, or undefined when the library does not list it. The open
// project's chats live in `chats`; the other projects' in `chatsByProject`.
export function projectOfChat(library: LibraryState, chatId: string): string | undefined {
  if (library.chats.some((chat) => chat.id === chatId)) {
    return library.openProjectId ?? undefined
  }
  for (const [projectId, chats] of Object.entries(library.chatsByProject)) {
    if (chats.some((chat) => chat.id === chatId)) return projectId
  }
  return undefined
}

// Pinned chats first, newest pin first. Then the rest, ordered by when the
// user last sent a message (updatedAt is only bumped on user messages).
export function orderedChats(chats: ChatSummary[]): ChatSummary[] {
  const pinned = chats.filter((chat) => chat.pinned).sort((left, right) => right.pinnedAt - left.pinnedAt)
  const rest = chats.filter((chat) => !chat.pinned).sort((left, right) => right.updatedAt - left.updatedAt)
  return [...pinned, ...rest]
}
