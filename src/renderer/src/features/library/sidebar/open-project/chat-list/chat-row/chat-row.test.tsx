import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRow, type ChatRowProps } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const summary: ChatSummary = {
  id: "c1",
  title: "Launch notes",
  pinned: false,
  pinnedAt: 0,
  updatedAt: 0,
  running: false,
  status: "idle",
  finishedAt: null,
}

const base: ChatRowProps = {
  chat: summary,
  status: "idle",
  active: false,
  renaming: false,
  onOpen: noop,
  onContextMenu: noop,
  Menu: ({ chat }) => <span data-slot="menu">{chat.id}</span>,
  Rename: ({ chat }) => <span data-slot="rename">{chat.id}</span>,
}

describe("ChatRow", () => {
  it("can show the chat's title with its menu", () => {
    const html = viewMarkup(<ChatRow {...base} />)

    expect(html).toContain("Launch notes")
    expect(html).toContain('<span data-slot="menu">c1</span>')
  })

  it("can show a pin mark for a pinned chat", () => {
    const html = viewMarkup(<ChatRow {...base} chat={{ ...summary, pinned: true }} />)

    expect(html).toContain("lucide-pin")
  })

  it("can highlight the chat that is open", () => {
    const html = viewMarkup(<ChatRow {...base} active />)

    expect(html).toContain("bg-foreground/10")
  })

  it("can show the rename field in place of the row while renaming", () => {
    const html = viewMarkup(<ChatRow {...base} renaming />)

    expect(html).toBe('<span data-slot="rename">c1</span>')
  })

  it("can label the status dot for a running chat", () => {
    const html = viewMarkup(<ChatRow {...base} status="running" />)

    expect(html).toContain('aria-label="Working"')
  })
})
