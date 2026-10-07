import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { Response, type ResponseProps } from "@/features/transcript/message-list/assistant-turn/response/response"
import { viewMarkup } from "@/test/view-markup"

function Commentable({ messageId, children }: { messageId: string; children: ReactNode }) {
  return <div data-commentable={messageId}>{children}</div>
}

function props(overrides: Partial<ResponseProps> = {}): ResponseProps {
  return {
    messageId: "a1",
    blocks: [
      { text: "First", code: false },
      { text: "Second", code: false },
    ],
    shown: undefined,
    streaming: false,
    Commentable,
    ...overrides,
  }
}

describe("Response", () => {
  it("renders every block of a reply that did not stream here", () => {
    const markup = viewMarkup(<Response {...props()} />)

    expect(markup).toContain("First")
    expect(markup).toContain("Second")
  })

  it("renders only the revealed blocks of a reply that is streaming here", () => {
    const markup = viewMarkup(<Response {...props({ shown: 1, streaming: true })} />)

    expect(markup).toContain("First")
    expect(markup).not.toContain("Second")
  })
})
