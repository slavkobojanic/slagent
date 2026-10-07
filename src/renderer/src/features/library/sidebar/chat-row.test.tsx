import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRow, type ChatRowProps } from "@/features/library/sidebar/chat-row"
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
  menuOpen: false,
  draft: "",
  onOpen: noop,
  onPin: noop,
  onRename: noop,
  onDraftChange: noop,
  onSave: noop,
  onCancel: noop,
  onDelete: noop,
  onCopy: noop,
  onMenuOpenChange: noop,
}

describe("ChatRow", () => {
  it("can show the chat's title with its status dot", () => {
    const html = viewMarkup(<ChatRow {...base} />)

    expect(html).toContain("Launch notes")
    expect(html).toContain('aria-label="Launch notes actions"')
  })

  it("can show a pin mark for a pinned chat", () => {
    const html = viewMarkup(<ChatRow {...base} chat={{ ...summary, pinned: true }} />)

    expect(html).toContain("lucide-pin")
  })

  it("can highlight the chat that is open", () => {
    const html = viewMarkup(<ChatRow {...base} active />)

    expect(html).toContain("bg-foreground/10")
  })

  it("can show the rename field in place of the title while renaming", () => {
    const html = viewMarkup(<ChatRow {...base} renaming draft="Renamed" />)

    expect(html).toContain('aria-label="Chat name"')
    expect(html).toContain('value="Renamed"')
    expect(html).not.toContain("Launch notes")
  })

  it("can label the status dot for a running chat", () => {
    const html = viewMarkup(<ChatRow {...base} status="running" />)

    expect(html).toContain('aria-label="Working"')
  })
})
