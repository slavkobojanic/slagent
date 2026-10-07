import type { ChatSearchResult } from "../shared/types"
import type { Library } from "./library"

const LIMIT = 50
const CONTEXT = 60

// Case-insensitive search over chat titles and the user and assistant text of
// every chat in every project. A chat matches when its title or one of its
// messages contains every term. Newest chats come first, each showing its
// best-matching message. An empty query lists the most recent chats, which is
// what the composer's $ picker shows before the user types.
export function searchChats(library: Library, query: string): ChatSearchResult[] {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))]
  if (terms.length === 0) {
    const recent: ChatSearchResult[] = []
    for (const project of library.projects()) {
      for (const chat of library.projectChats(project.id)) {
        recent.push({
          projectId: project.id,
          projectName: project.name,
          chatId: chat.id,
          title: chat.title,
          updatedAt: chat.updatedAt,
          snippet: "",
          messageId: null,
        })
      }
    }
    return recent.sort((left, right) => right.updatedAt - left.updatedAt).slice(0, LIMIT)
  }
  const hits = new Map(library.searchMessages(terms).map((hit) => [hit.chatId, hit]))
  const focus = terms.reduce((longest, term) => (term.length > longest.length ? term : longest))

  const results: ChatSearchResult[] = []
  for (const project of library.projects()) {
    for (const chat of library.projectChats(project.id)) {
      const hit = hits.get(chat.id)
      const title = chat.title.toLowerCase()
      if (!hit && !terms.every((term) => title.includes(term))) continue
      results.push({
        projectId: project.id,
        projectName: project.name,
        chatId: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        snippet: hit ? (excerpt(hit.text, focus) ?? "") : "",
        messageId: hit?.messageId ?? null,
      })
    }
  }
  results.sort((left, right) => right.updatedAt - left.updatedAt)
  return results.slice(0, LIMIT)
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
