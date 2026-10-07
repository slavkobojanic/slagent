import { describe, expect, it } from "vitest"
import { GutterButton } from "@/features/transcript/commentable-response/commentable-block/gutter-button/gutter-button"
import { viewMarkup } from "@/test/view-markup"

describe("GutterButton", () => {
  it("can render the gutter comment button", () => {
    const markup = viewMarkup(<GutterButton onClick={() => {}} />)

    expect(markup).toContain('aria-label="Comment on this part"')
  })
})
