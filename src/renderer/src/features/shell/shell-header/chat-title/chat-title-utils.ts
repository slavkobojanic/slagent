import type { ChatSummary, LibraryState } from "@shared/types"
import { chatOf } from "@/features/library/library-utils"

// The active thread can belong to any project, so the lookup spans the whole library.
export function openChatOf(library: LibraryState): ChatSummary | null {
  if (library.openChatId === null) {
    return null
  }
  return chatOf(library, library.openChatId) ?? null
}
