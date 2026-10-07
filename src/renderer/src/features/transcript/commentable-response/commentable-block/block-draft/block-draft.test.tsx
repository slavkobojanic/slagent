import { describe, expect, it } from "vitest"
import { BlockDraft } from "@/features/transcript/commentable-response/commentable-block/block-draft/block-draft"
import { viewMarkup } from "@/test/view-markup"

describe("BlockDraft", () => {
  it("can render the open draft with its save label and its text", () => {
    const markup = viewMarkup(<BlockDraft initial="Use a set." saveLabel="Save" onSave={() => {}} onCancel={() => {}} />)

    expect(markup).toContain("Use a set.")
    expect(markup).toContain("Save")
  })
})
