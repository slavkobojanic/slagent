import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRowMenu } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const summary: ChatSummary = { id: "c1", title: "Launch notes", pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }

describe("ChatRowMenu", () => {
  it("can label its trigger for the chat it belongs to", () => {
    const html = viewMarkup(<ChatRowMenu chat={summary} open={false} onOpenChange={noop} onPin={noop} onRename={noop} onCopy={noop} onDelete={noop} />)

    expect(html).toContain('aria-label="Launch notes actions"')
  })
})
