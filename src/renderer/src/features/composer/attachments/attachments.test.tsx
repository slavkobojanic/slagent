import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { Attachments } from "@/features/composer/attachments/attachments"

describe("Attachments", () => {
  it("can render nothing while no file is attached", () => {
    expect(viewMarkup(<Attachments items={[]} onRemove={vi.fn()} />)).toBe("")
  })

  it("can show a thumbnail for an image and a name chip for any other file", () => {
    const markup = viewMarkup(
      <Attachments
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
