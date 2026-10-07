import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { StaticResponse } from "@/features/transcript/reveal/static-response"
import { viewMarkup } from "@/test/view-markup"

function Commentable({ messageId, children }: { messageId: string; children: ReactNode }) {
  return <div data-commentable={messageId}>{children}</div>
}

describe("StaticResponse", () => {
  it("renders every block through the commentable slot for its message", () => {
    const markup = viewMarkup(
      <StaticResponse
        messageId="a2"
        blocks={[
          { text: "One", code: false },
          { text: "Two", code: false },
        ]}
        Commentable={Commentable}
      />,
    )

    expect(markup).toContain("One")
    expect(markup).toContain("Two")
    expect(markup.match(/data-commentable="a2"/g)).toHaveLength(2)
  })

  it("renders no reveal class, since a finished reply does not fade in", () => {
    const markup = viewMarkup(<StaticResponse messageId="a2" blocks={[{ text: "Done", code: true }]} Commentable={Commentable} />)

    expect(markup).not.toContain("reveal-block")
  })
})
