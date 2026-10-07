import { describe, expect, it, vi } from "vitest"
import { ConversationScrollButton, PinnedScroller } from "@/components/ai-elements/conversation"
import { viewMarkup } from "@/test/view-markup"

describe("ConversationScrollButton", () => {
  it("renders nothing while the reader is at the bottom", () => {
    const markup = viewMarkup(<ConversationScrollButton visible={false} onClick={vi.fn()} />)

    expect(markup).toBe("")
  })

  it("renders the round button while the reader is away from the bottom", () => {
    const markup = viewMarkup(<ConversationScrollButton visible onClick={vi.fn()} aria-label="Jump to latest" />)

    expect(markup).toContain('aria-label="Jump to latest"')
    expect(markup).toContain("rounded-full")
  })
})

describe("PinnedScroller", () => {
  it("renders its children inside the scroller with the given classes", () => {
    const markup = viewMarkup(
      <PinnedScroller watch="output" className="max-h-72 overflow-auto">
        <span>streamed line</span>
      </PinnedScroller>,
    )

    expect(markup).toContain("max-h-72 overflow-auto")
    expect(markup).toContain("streamed line")
  })
})
