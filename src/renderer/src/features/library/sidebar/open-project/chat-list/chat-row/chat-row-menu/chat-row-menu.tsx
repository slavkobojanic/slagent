import type { ChatSummary } from "@shared/types"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { RowMenu } from "@/features/library/sidebar/row-menu/row-menu"

export type ChatRowMenuProps = {
  chat: ChatSummary
  open: boolean
  onOpenChange: (chat: ChatSummary, open: boolean) => void
  onPin: (chat: ChatSummary) => void
  onRename: (chat: ChatSummary) => void
  onCopy: (chat: ChatSummary) => void
  onDelete: (chat: ChatSummary) => void
}

export function ChatRowMenu({ chat, open, onOpenChange, onPin, onRename, onCopy, onDelete }: ChatRowMenuProps) {
  return (
    <RowMenu label={`${chat.title} actions`} open={open} onOpenChange={(next) => onOpenChange(chat, next)}>
      <DropdownMenuItem onSelect={() => onPin(chat)}>{chat.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onRename(chat)}>Rename</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onCopy(chat)}>Copy transcript</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => onDelete(chat)}>
        Delete
      </DropdownMenuItem>
    </RowMenu>
  )
}
