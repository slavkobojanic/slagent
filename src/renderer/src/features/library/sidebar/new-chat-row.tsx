import { PlusIcon } from "lucide-react"

export type NewChatRowProps = {
  label: string
  onNew: () => void
}

// The always-present draft thread of a project's chat list. It never disappears, so an unsent
// draft is always reachable.
export function NewChatRow({ label, onNew }: NewChatRowProps) {
  return (
    <div className="ml-3 flex min-w-0 items-center overflow-hidden rounded-md">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm text-foreground/40 transition-colors hover:text-foreground/70"
        onClick={onNew}
      >
        <PlusIcon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    </div>
  )
}
