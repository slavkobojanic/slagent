import { Plus, Server } from "lucide-react"
import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import type { ChatGroup } from "@/features/mobile/chat-list/chat-list-items"
import { MobileChatRow } from "./mobile-chat-row/mobile-chat-row"
import "@/features/mobile/mobile.css"

export type MobileChatListProps = {
  groups: ChatGroup[]
  empty: boolean
  ready: boolean
  opening: string | null
  error: string | null
  // The connected computer under the title, with its dropdown to switch Macs.
  MacPicker: ComponentType
  onOpenChat: (projectId: string, chatId: string) => void
  onNewChat: (projectId: string | null) => void
  onOpenConnection: () => void
  onDismissError: () => void
  Banner: ComponentType
}

export function MobileChatList({ groups, empty, ready, opening, error, MacPicker, onOpenChat, onNewChat, onOpenConnection, onDismissError, Banner }: MobileChatListProps) {
  return (
    <div className="mobile-safe-x flex h-full flex-col bg-background text-foreground">
      <header className="mobile-safe-top shrink-0 border-b border-border">
        <div className="flex h-12 items-center gap-2 px-4">
          <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">Chats</h1>
          <Button type="button" variant="ghost" size="icon" aria-label="Connection" onClick={onOpenConnection}>
            <Server className="size-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="mobile-press" aria-label="New chat" onClick={() => onNewChat(null)}>
            <Plus className="size-5" />
          </Button>
        </div>
        <div className="px-4 pb-2">
          <MacPicker />
        </div>
      </header>
      <Banner />
      {error !== null ? (
        <button type="button" role="alert" className="border-b border-border px-4 py-2 text-left text-sm text-destructive" onClick={onDismissError}>
          {error}
        </button>
      ) : null}
      <div className="mobile-safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Body groups={groups} empty={empty} ready={ready} opening={opening} onOpenChat={onOpenChat} onNewChat={onNewChat} />
      </div>
    </div>
  )
}

function Body({
  groups,
  empty,
  ready,
  opening,
  onOpenChat,
  onNewChat,
}: Pick<MobileChatListProps, "groups" | "empty" | "ready" | "opening" | "onOpenChat" | "onNewChat">) {
  if (!ready) {
    return <p className="px-4 py-8 text-center text-sm text-foreground/50">Loading chats…</p>
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-sm text-foreground/60">No chats yet. Open a folder in slagent on your Mac to see its chats here, or start a chat now.</p>
        <Button type="button" className="mobile-press" onClick={() => onNewChat(null)}>
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
    )
  }
  return (
    <div className="pb-6">
      {groups.map((group) => (
        <section key={group.id} aria-label={group.name}>
          <div className="flex items-center gap-2 px-4 pt-5 pb-1">
            <h2 className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/50">{group.name}</h2>
            <Button type="button" variant="ghost" size="xs" className="mobile-press" aria-label={`New chat in ${group.name}`} onClick={() => onNewChat(group.newChatProjectId)}>
              <Plus className="size-3.5" />
              New
            </Button>
          </div>
          {group.items.length === 0 ? (
            <p className="px-4 py-2 text-sm text-foreground/40">No chats yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {group.items.map((item) => (
                <MobileChatRow key={item.chat.id} item={item} opening={opening === item.chat.id} onOpen={onOpenChat} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
