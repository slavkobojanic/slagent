import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatList, type ChatListProps } from "@/features/library/sidebar/open-project/chat-list/chat-list"
import { viewMarkup } from "@/test/view-markup"

function chat(id: string, title: string): ChatSummary {
  return { id, title, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

const base: ChatListProps = {
  chats: [],
  empty: false,
  hasHidden: false,
  reduceMotion: false,
  ChatRow: ({ chat: summary }) => <span>{summary.title}</span>,
  Footer: () => <div data-slot="footer" />,
}

describe("ChatList", () => {
  it("can render a row for each chat, then the footer", () => {
    const html = viewMarkup(<ChatList {...base} chats={[chat("c1", "Launch notes")]} />)

    expect(html).toContain("Launch notes")
    expect(html).toContain('data-slot="footer"')
  })

  it("can say when the open project has no chats", () => {
    expect(viewMarkup(<ChatList {...base} empty />)).toContain("No chats yet")
  })

  it("can fade the last rows when more chats are hidden", () => {
    expect(viewMarkup(<ChatList {...base} hasHidden />)).toContain("bg-gradient-to-b")
    expect(viewMarkup(<ChatList {...base} />)).not.toContain("bg-gradient-to-b")
  })
})
