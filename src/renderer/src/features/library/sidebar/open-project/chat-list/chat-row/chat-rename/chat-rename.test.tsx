import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatRename } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const summary: ChatSummary = { id: "c1", title: "Launch notes", pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }

describe("ChatRename", () => {
  it("can show the rename field with the draft title", () => {
    const html = viewMarkup(<ChatRename chat={summary} draft="Renamed" onDraftChange={noop} onSave={noop} onCancel={noop} />)

    expect(html).toContain('aria-label="Chat name"')
    expect(html).toContain('value="Renamed"')
  })
})
