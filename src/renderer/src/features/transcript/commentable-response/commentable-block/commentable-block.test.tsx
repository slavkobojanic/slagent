import { describe, expect, it } from "vitest"
import { CommentableBlock } from "@/features/transcript/commentable-response/commentable-block/commentable-block"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

describe("CommentableBlock", () => {
  it("can render its parts inside the wrapper the popovers are placed in", () => {
    const markup = viewMarkup(
      <CommentableBlock wrapperRef={noop} onMouseUp={noop} onMouseMove={noop} onMouseLeave={noop}>
        <p>Use a map.</p>
      </CommentableBlock>,
    )

    expect(markup).toBe('<div class="group/reply relative"><p>Use a map.</p></div>')
  })
})
