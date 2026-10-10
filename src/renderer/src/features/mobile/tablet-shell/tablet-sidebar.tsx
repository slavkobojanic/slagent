import type { ComponentType } from "react"

export type TabletSidebarProps = {
  ChatList: ComponentType
}

// The docked chat list. The frame's slot animation targets its direct `aside` child.
export function TabletSidebar({ ChatList }: TabletSidebarProps) {
  return (
    <aside className="h-full border-r border-border" aria-label="Chats">
      <ChatList />
    </aside>
  )
}
