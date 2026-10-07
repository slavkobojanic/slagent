import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReplyComment } from "@shared/types"
import { CommentBody, type CommentBodyProps } from "@/features/transcript/commentable-response/commentable-block/comment-body/comment-body"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

const comment: ReplyComment = { id: "w1", messageId: "m1", block: "Use a map.", quote: "Use a map.", text: "why" }

function body(overrides: Partial<CommentBodyProps> = {}) {
  return (
    <CommentBody comment={null} open={false} highlighted={false} onOpenChange={noop} onEdit={noop} onDelete={noop} {...overrides}>
      <p>Use a map.</p>
    </CommentBody>
  )
}

describe("CommentBody", () => {
  it("can render the text inside the body that the highlights are measured in", () => {
    const markup = viewMarkup(body())

    expect(markup).toContain('data-comment-body=""')
    expect(markup).toContain("Use a map.")
  })

  it("can render the body highlighted when it carries a whole-block comment", () => {
    const markup = viewMarkup(body({ highlighted: true, comment }))

    expect(markup).toContain("reply-highlight")
  })

  it("can render the whole-block comment in a hover card while the hover is open", () => {
    render(body({ highlighted: true, comment, open: true }))

    expect(document.body.textContent).toContain("why")
  })
})
