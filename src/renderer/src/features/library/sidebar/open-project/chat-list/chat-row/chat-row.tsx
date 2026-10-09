import { PinIcon } from "lucide-react"
import type { ComponentType } from "react"
import type { ChatStatus, ChatSummary } from "@shared/types"
import { StatusDot } from "@/components/status-dot"
import { cn } from "@/lib/utils"

export type ChatRowProps = {
  chat: ChatSummary
  status: ChatStatus
  active: boolean
  renaming: boolean
  onOpen: (chat: ChatSummary) => void
  onContextMenu: (chat: ChatSummary) => void
  Menu: ComponentType<{ chat: ChatSummary }>
  Rename: ComponentType<{ chat: ChatSummary }>
}

export function ChatRow({ chat, status, active, renaming, onOpen, onContextMenu, Menu, Rename }: ChatRowProps) {
  if (renaming) {
    return <Rename chat={chat} />
  }

  return (
    <div
      className={cn("group ml-3 flex min-w-0 items-center overflow-hidden rounded-md", active && "bg-foreground/10")}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu(chat)
      }}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={() => onOpen(chat)}>
        <StatusDot status={status} />
        <span className="truncate">{chat.title}</span>
        {chat.pinned ? <PinIcon className="size-3 shrink-0 text-foreground/40" /> : null}
      </button>
      <Menu chat={chat} />
    </div>
  )
}
