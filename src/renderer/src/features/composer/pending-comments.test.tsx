import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { PendingComments } from "@/features/composer/pending-comments"

function render(replies: Array<{ id: string; quote: string; text: string }>, diffs: Array<{ id: string; location: string; text: string }>) {
  return viewMarkup(
    <PendingComments label="1 reply comment and 1 diff comment" replies={replies} diffs={diffs} onRemoveReply={vi.fn()} onRemoveDiff={vi.fn()} />,
  )
}

describe("PendingComments", () => {
  it("can render nothing when no comment is pending", () => {
    expect(render([], [])).toBe("")
  })

  it("can list reply and diff comments under the summary label", () => {
    const markup = render([{ id: "r1", quote: "the words", text: "why" }], [{ id: "d1", location: "main.ts:12", text: "rename" }])

    expect(markup).toContain("1 reply comment and 1 diff comment will be sent with your next message")
    expect(markup).toContain("“the words”")
    expect(markup).toContain("main.ts:12")
  })
})
