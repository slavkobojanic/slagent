import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { FadingResponse, type FadingResponseProps } from "@/features/transcript/reveal/fading-response"
import { viewMarkup } from "@/test/view-markup"

// The review slice's wrapper, reduced to a marker that names the message it belongs to.
function Commentable({ messageId, children }: { messageId: string; children: ReactNode }) {
  return <div data-commentable={messageId}>{children}</div>
}

function props(overrides: Partial<FadingResponseProps> = {}): FadingResponseProps {
  return {
    messageId: "a1",
    blocks: [
      { text: "First", code: false },
      { text: "Second", code: false },
      { text: "Third", code: false },
    ],
    shown: 3,
    streaming: false,
    Commentable,
    ...overrides,
  }
}

describe("FadingResponse", () => {
  it("shows only the blocks revealed so far", () => {
    const markup = viewMarkup(<FadingResponse {...props({ shown: 2 })} />)

    expect(markup).toContain("First")
    expect(markup).toContain("Second")
    expect(markup).not.toContain("Third")
  })

  it("shows every block once the reveal has finished", () => {
    const markup = viewMarkup(<FadingResponse {...props({ shown: 3 })} />)

    expect(markup).toContain("Third")
  })

  it("marks code blocks for the reveal fade", () => {
    const markup = viewMarkup(<FadingResponse {...props({ blocks: [{ text: "const a = 1", code: true }], shown: 1 })} />)

    expect(markup).toContain('class="reveal-block"')
  })

  it("wraps each revealed block in the commentable slot for its message", () => {
    const markup = viewMarkup(<FadingResponse {...props({ shown: 2 })} />)

    expect(markup.match(/data-commentable="a1"/g)).toHaveLength(2)
  })
})
