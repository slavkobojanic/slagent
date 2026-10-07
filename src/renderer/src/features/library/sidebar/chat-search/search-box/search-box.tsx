import { SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

export type SearchBoxProps = {
  inputId: string
  query: string
  onQueryChange: (value: string) => void
  onKeyDown: (key: string) => void
  onClear: () => void
}

export function SearchBox({ inputId, query, onQueryChange, onKeyDown, onClear }: SearchBoxProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground/40" />
      <Input
        id={inputId}
        value={query}
        placeholder="Search chats"
        aria-label="Search chats"
        className="h-8 pr-7 pl-8 text-sm"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => onKeyDown(event.key)}
      />
      {query ? (
        <button
          type="button"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
          aria-label="Clear search"
          onClick={() => onClear()}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
