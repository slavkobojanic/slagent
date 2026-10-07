import type { ChatSummary } from "@shared/types"
import { Input } from "@/components/ui/input"

export type ChatRenameProps = {
  chat: ChatSummary
  draft: string
  onDraftChange: (value: string) => void
  onSave: (chat: ChatSummary) => void
  onCancel: () => void
}

export function ChatRename({ chat, draft, onDraftChange, onSave, onCancel }: ChatRenameProps) {
  return (
    <form
      className="px-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(chat)
      }}
    >
      <Input
        value={draft}
        autoFocus
        aria-label="Chat name"
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={() => onSave(chat)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel()
          }
        }}
      />
    </form>
  )
}
