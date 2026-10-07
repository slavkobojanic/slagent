import { PinIcon } from "lucide-react"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { RowMenu } from "@/features/library/sidebar/row-menu"
import { StatusDot } from "@/features/library/sidebar/status-dot"
import { cn } from "@/lib/utils"
import type { ChatStatus, ChatSummary } from "@shared/types"

export type ChatRowModel = {
  chat: ChatSummary
  status: ChatStatus
  active: boolean
  renaming: boolean
  menuOpen: boolean
}

// What a chat row can do. The sidebar passes the same set to every row.
export type ChatActions = {
  onOpen: (chat: ChatSummary) => void
  onPin: (chat: ChatSummary) => void
  onRename: (chat: ChatSummary) => void
  onDraftChange: (value: string) => void
  onSave: (chat: ChatSummary) => void
  onCancel: () => void
  onDelete: (chat: ChatSummary) => void
  onCopy: (chat: ChatSummary) => void
  onMenuOpenChange: (chat: ChatSummary, open: boolean) => void
}

export type ChatRowProps = ChatRowModel &
  ChatActions & {
    // The title being typed while this row is renamed.
    draft: string
  }

// One chat in the open project's list. Renaming swaps the title for an input in place.
export function ChatRow({
  chat,
  status,
  active,
  renaming,
  menuOpen,
  draft,
  onOpen,
  onPin,
  onRename,
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  onCopy,
  onMenuOpenChange,
}: ChatRowProps) {
  if (renaming) {
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

  return (
    <div
      className={cn("group ml-3 flex min-w-0 items-center overflow-hidden rounded-md", active && "bg-foreground/10")}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenuOpenChange(chat, true)
      }}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={() => onOpen(chat)}>
        <StatusDot status={status} />
        <span className="truncate">{chat.title}</span>
        {chat.pinned ? <PinIcon className="size-3 shrink-0 text-foreground/40" /> : null}
      </button>
      <RowMenu label={`${chat.title} actions`} open={menuOpen} onOpenChange={(open) => onMenuOpenChange(chat, open)}>
        <DropdownMenuItem onSelect={() => onPin(chat)}>{chat.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRename(chat)}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCopy(chat)}>Copy transcript</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(chat)}>
          Delete
        </DropdownMenuItem>
      </RowMenu>
    </div>
  )
}
