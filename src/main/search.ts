import type { ChatMessage, ChatSearchResult } from "../shared/types"
import type { Library } from "./library"

const LIMIT = 50
const CONTEXT = 60

type LiveMessages = (projectId: string, chatId: string) => ChatMessage[] | null

// Case-insensitive search over chat titles and the user and assistant text of
// every chat in every project. Newest chats come first.
export async function searchChats(library: Library, query: string, live: LiveMessages): Promise<ChatSearchResult[]> {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const candidates: { projectId: string; projectName: string; chatId: string; title: string; updatedAt: number }[] = []
  for (const project of library.projects()) {
    for (const chat of library.projectChats(project.id)) {
      candidates.push({
        projectId: project.id,
        projectName: project.name,
        chatId: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
      })
    }
  }
  candidates.sort((left, right) => right.updatedAt - left.updatedAt)

  const results: ChatSearchResult[] = []
  for (const candidate of candidates) {
    if (results.length >= LIMIT) break
    const messages = live(candidate.projectId, candidate.chatId) ?? (await library.readTranscript(candidate.projectId, candidate.chatId))
    let snippet: string | null = null
    for (const message of messages) {
      if (message.role === "tool") continue
      snippet = excerpt(message.text, needle)
      if (snippet) break
    }
    if (!snippet && !candidate.title.toLowerCase().includes(needle)) continue
    results.push({ ...candidate, snippet: snippet ?? "" })
  }
  return results
}

function excerpt(text: string, needle: string): string | null {
  const index = text.toLowerCase().indexOf(needle)
  if (index < 0) return null
  const start = Math.max(0, index - CONTEXT)
  const end = Math.min(text.length, index + needle.length + CONTEXT)
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim()
  if (start > 0) snippet = `…${snippet}`
  if (end < text.length) snippet = `${snippet}…`
  return snippet
}
