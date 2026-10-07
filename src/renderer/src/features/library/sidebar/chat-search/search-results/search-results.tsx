import type { ChatSearchResult } from "@shared/types"
import { cn } from "@/lib/utils"

export type SearchResultsProps = {
  results: ChatSearchResult[]
  openChatId: string | null
  onOpen: (result: ChatSearchResult) => void
}

export function SearchResults({ results, openChatId, onOpen }: SearchResultsProps) {
  if (results.length === 0) {
    return <p className="px-2 py-1 text-sm text-foreground/40">No matching chats</p>
  }
  return (
    <section className="space-y-1">
      {results.map((result) => (
        <button
          key={`${result.projectId}:${result.chatId}`}
          type="button"
          className={cn("block w-full min-w-0 rounded-md px-2 py-1.5 text-left hover:bg-foreground/5", result.chatId === openChatId && "bg-foreground/10")}
          onClick={() => onOpen(result)}
        >
          <span className="block truncate text-sm">{result.title}</span>
          <span className="block truncate text-xs text-foreground/40">{result.projectName}</span>
          {result.snippet ? <span className="mt-0.5 line-clamp-2 block text-xs text-foreground/60">{result.snippet}</span> : null}
        </button>
      ))}
    </section>
  )
}
