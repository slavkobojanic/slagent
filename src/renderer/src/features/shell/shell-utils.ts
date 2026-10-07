import type { ChatSummary, LibraryState, ProjectSummary } from "@shared/types"

// The project the library has open, or null when none is open.
export function openProjectOf(library: LibraryState): ProjectSummary | null {
  if (library.openProjectId === null) {
    return null
  }
  return library.projects.find((project) => project.id === library.openProjectId) ?? null
}

// The chat the library has open, or null for a draft.
export function openChatOf(library: LibraryState): ChatSummary | null {
  if (library.openChatId === null) {
    return null
  }
  return library.chats.find((chat) => chat.id === library.openChatId) ?? null
}

// The project menu lists the most recently opened project first. The input is not reordered.
export function sidebarToggleTitle(open: boolean, mod: string): string {
  return `${open ? "Hide" : "Show"} sidebar (${mod}B)`
}

export function panelToggleTitle(open: boolean, mod: string): string {
  return `${open ? "Hide" : "Show"} panel (${mod}⇧D)`
}
