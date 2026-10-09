import { ChevronRight, PinIcon } from "lucide-react"
import { StatusDot } from "@/components/status-dot"
import { Spinner } from "@/components/ui/spinner"
import type { ChatListItem } from "@/features/mobile/chat-list/chat-list-items"
import "@/features/mobile/mobile.css"

export type MobileChatRowProps = {
  item: ChatListItem
  opening: boolean
  onOpen: (projectId: string, chatId: string) => void
}

export function MobileChatRow({ item, opening, onOpen }: MobileChatRowProps) {
  const { chat, projectId, status } = item
  return (
    <li>
      <button
        type="button"
        className="mobile-press flex min-h-12 w-full min-w-0 items-center gap-3 px-4 py-3 text-left text-base active:bg-foreground/10"
        onClick={() => onOpen(projectId, chat.id)}
      >
        <span className="flex w-3 shrink-0 justify-center">
          <StatusDot status={status} />
        </span>
        <span className="min-w-0 flex-1 truncate">{chat.title}</span>
        {chat.pinned ? <PinIcon className="size-3.5 shrink-0 text-foreground/40" aria-label="Pinned" /> : null}
        {opening ? <Spinner className="size-4 shrink-0 text-foreground/50" /> : <ChevronRight className="size-4 shrink-0 text-foreground/30" />}
      </button>
    </li>
  )
}
