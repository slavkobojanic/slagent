import { describe, expect, it } from "vitest"
import { SelectionButton } from "@/features/transcript/commentable-response/commentable-block/selection-button/selection-button"
import { viewMarkup } from "@/test/view-markup"

describe("SelectionButton", () => {
  it("can render the comment button above the selected words", () => {
    const markup = viewMarkup(<SelectionButton top={20} left={30} onClick={() => {}} />)

    expect(markup).toContain('aria-label="Comment on this part"')
    expect(markup).toContain("top: 14px")
    expect(markup).toContain("left: 30px")
  })
})
