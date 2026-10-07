import { describe, expect, it } from "vitest"
import { CommentDraft } from "@/components/comment-draft"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

describe("CommentDraft", () => {
  it("can render an empty draft with the add label and a required field", () => {
    const markup = viewMarkup(<CommentDraft onSave={noop} onCancel={noop} />)

    expect(markup).toContain("Add comment")
    expect(markup).toContain("required")
  })

  it("can render an edit with the text it opens with and the save label", () => {
    const markup = viewMarkup(<CommentDraft initial="Use a set." saveLabel="Save" onSave={noop} onCancel={noop} />)

    expect(markup).toContain("Use a set.")
    expect(markup).toContain("Save")
    expect(markup).not.toContain("Add comment")
  })
})
