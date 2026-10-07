import type { ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { Library } from "../library"
import { searchChats } from "../search"
import { renderTranscript, shortDate } from "../transcript-text"

const DEFAULT_LIMIT = 8
const SNIPPET = 200

const searchParams = Type.Object({
  query: Type.String({ description: "Search terms; every term must appear in the chat's title or one of its messages." }),
  all: Type.Optional(Type.Boolean({ description: "Search every project instead of only the current one. Default false." })),
  limit: Type.Optional(Type.Number({ description: "Maximum hits to return, default 8." })),
})

const readParams = Type.Object({
  chatId: Type.String({ description: "The chatId from a search_chats hit." }),
})

export function chatHistoryExtension(deps: { library: Library; currentProjectId: () => string }): ExtensionFactory {
  return (pi) => {
    pi.registerTool({
      name: "search_chats",
      label: "Search chats",
      description:
        "Search the user's past chats in this app by title or content. Returns ranked hits with title, date, chatId and a matched snippet. Follow up with read_chat to load a hit's transcript.",
      promptSnippet: "Search and read the user's past chats",
      promptGuidelines: [
        "When the user refers to a past conversation you have not seen, search_chats first, then read_chat on the best hit.",
        "search_chats only sees the current project unless all is true; say so when widening.",
      ],
      parameters: searchParams,
      async execute(_id, input) {
        const record = (input ?? {}) as { query?: unknown; all?: unknown; limit?: unknown }
        const query = typeof record.query === "string" ? record.query : ""
        if (!query.trim()) return { details: undefined, content: [{ type: "text", text: "Give search terms." }] }
        const all = record.all === true
        const limit = typeof record.limit === "number" && Number.isFinite(record.limit) ? Math.max(1, Math.min(record.limit, 25)) : DEFAULT_LIMIT
        let results = searchChats(deps.library, query)
        if (!all) {
          const projectId = deps.currentProjectId()
          results = results.filter((hit) => hit.projectId === projectId)
        }
        if (results.length === 0) return { details: undefined, content: [{ type: "text", text: all ? "No chats matched." : "No chats in this project matched. Try all: true to search other projects." }] }
        const lines = results.slice(0, limit).map((hit) => {
          const where = all ? ` — ${hit.projectName}` : ""
          const snippet = hit.snippet.length > SNIPPET ? `${hit.snippet.slice(0, SNIPPET)}…` : hit.snippet
          const body = snippet ? `\n  ${snippet}` : ""
          return `- “${hit.title}” (${shortDate(hit.updatedAt)}${where}) chatId=${hit.chatId}${body}`
        })
        return {
          details: undefined,
          content: [{ type: "text", text: `${results.length} hit(s), showing ${lines.length}:\n${lines.join("\n")}` }],
        }
      },
    })

    pi.registerTool({
      name: "read_chat",
      label: "Read chat",
      description: "Load the user-and-assistant transcript of one of the user's past chats, truncated. Use search_chats to find a chatId first.",
      promptSnippet: "Read a past chat's transcript",
      promptGuidelines: ["Call read_chat after search_chats picks a hit; do not guess chatIds."],
      parameters: readParams,
      async execute(_id, input) {
        const record = (input ?? {}) as { chatId?: unknown }
        const chatId = typeof record.chatId === "string" ? record.chatId : ""
        if (!chatId) return { details: undefined, content: [{ type: "text", text: "Give the chatId of a search_chats hit." }] }
        for (const project of deps.library.projects()) {
          const chat = deps.library.chat(project.id, chatId)
          if (!chat) continue
          const messages = await deps.library.readTranscript(project.id, chatId)
          if (messages.length === 0) return { details: undefined, content: [{ type: "text", text: `“${chat.title}” has no transcript.` }] }
          const rendered = renderTranscript(messages)
          const head = `“${chat.title}” (${shortDate(chat.updatedAt)}${deps.currentProjectId() === project.id ? "" : ` — ${project.name}`})\n\n`
          return { details: undefined, content: [{ type: "text", text: `${head}${rendered.text}` }] }
        }
        return { details: undefined, content: [{ type: "text", text: "That chat is gone. Call search_chats again for a fresh hit." }] }
      },
    })
  }
}
