import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ReplyComment } from "@shared/types"
import { CommentableBlock, type CommentableBlockProps } from "@/components/review/commentable-response"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

const comment: ReplyComment = { id: "e1", messageId: "m1", block: "Use a map.", quote: "a map", at: 4, text: "why" }

function block(overrides: Partial<CommentableBlockProps> = {}) {
  return (
    <CommentableBlock
      gutter={false}
      wholeHighlighted={false}
      comment={null}
      hoverOpen={false}
      draft={null}
      pending={null}
      card={null}
      wrapperRef={noop}
      onGutter={noop}
      onPending={noop}
      onMouseUp={noop}
      onMouseMove={noop}
      onMouseLeave={noop}
      onCardEnter={noop}
      onCardLeave={noop}
      onCardOpenChange={noop}
      onEdit={noop}
      onDelete={noop}
      onSave={noop}
      onCancel={noop}
      {...overrides}
    >
      <p>Use a map.</p>
    </CommentableBlock>
  )
}

describe("CommentableBlock", () => {
  it("can render the gutter comment button on a block that can take a comment", () => {
    const markup = viewMarkup(block({ gutter: true }))

    expect(markup).toContain('aria-label="Comment on this part"')
  })

  it("can render the block without the gutter button when it cannot take a comment", () => {
    const markup = viewMarkup(block({ gutter: false }))

    expect(markup).not.toContain("Comment on this part")
    expect(markup).toContain("Use a map.")
  })

  it("can render the text inside the body that the highlights are measured in", () => {
    const markup = viewMarkup(block())

    expect(markup).toContain('data-comment-body=""')
  })

  it("can render the block highlighted when it carries a whole-block comment", () => {
    const markup = viewMarkup(block({ wholeHighlighted: true, comment }))

    expect(markup).toContain("reply-highlight")
  })

  it("can render the comment button above the selected words", () => {
    const markup = viewMarkup(block({ pending: { top: 20, left: 30 } }))

    expect(markup).toContain("Comment</button>")
    expect(markup).toContain("top: 14px")
    expect(markup).toContain("left: 30px")
  })

  it("can render the card of a commented excerpt with its comment and its actions", () => {
    const markup = viewMarkup(block({ card: { comment, top: 20, left: 200 } }))

    expect(markup).toContain("why")
    expect(markup).toContain("Edit")
    expect(markup).toContain("Delete")
  })

  it("can render the open draft with its save label and its text", () => {
    const markup = viewMarkup(block({ draft: { initial: "Use a set.", saveLabel: "Save" } }))

    expect(markup).toContain("Use a set.")
    expect(markup).toContain("Save")
    expect(markup).not.toContain("Comment on this part")
  })

  it("can render the whole-block comment in a hover card while the hover is open", () => {
    render(block({ wholeHighlighted: true, comment, hoverOpen: true }))

    expect(document.body.textContent).toContain("why")
  })
})
