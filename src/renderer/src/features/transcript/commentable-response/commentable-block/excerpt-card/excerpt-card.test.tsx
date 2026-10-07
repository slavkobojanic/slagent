import { describe, expect, it } from "vitest"
import type { ReplyComment } from "@shared/types"
import { ExcerptCard } from "@/features/transcript/commentable-response/commentable-block/excerpt-card/excerpt-card"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

const comment: ReplyComment = { id: "e1", messageId: "m1", block: "Use a map.", quote: "a map", at: 4, text: "why" }

describe("ExcerptCard", () => {
  it("can render the card of a commented excerpt with its comment and its actions", () => {
    const markup = viewMarkup(<ExcerptCard comment={comment} top={20} left={200} onEnter={noop} onLeave={noop} onEdit={noop} onDelete={noop} />)

    expect(markup).toContain("why")
    expect(markup).toContain("Edit")
    expect(markup).toContain("Delete")
    expect(markup).toContain("left: 200px")
  })

  it("can keep a card near the left edge inside the response", () => {
    const markup = viewMarkup(<ExcerptCard comment={comment} top={20} left={10} onEnter={noop} onLeave={noop} onEdit={noop} onDelete={noop} />)

    expect(markup).toContain("left: 144px")
  })
})
