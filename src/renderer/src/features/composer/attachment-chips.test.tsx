import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { AttachmentChips } from "@/features/composer/attachment-chips"

describe("AttachmentChips", () => {
  it("can show a thumbnail for an image and a name chip for any other file", () => {
    const markup = viewMarkup(
      <AttachmentChips
        items={[
          { id: "img", name: "shot.png", imageUrl: "blob:shot" },
          { id: "doc", name: "spec.pdf", imageUrl: null },
        ]}
        onRemove={vi.fn()}
      />,
    )

    expect(markup).toContain('src="blob:shot"')
    expect(markup).toContain("spec.pdf")
    expect(markup).toContain('aria-label="Remove spec.pdf"')
  })
})
