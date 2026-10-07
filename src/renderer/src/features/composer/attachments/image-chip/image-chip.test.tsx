import { describe, expect, it, vi } from "vitest"
import { ImageChip } from "@/features/composer/attachments/image-chip/image-chip"
import { viewMarkup } from "@/test/view-markup"

describe("ImageChip", () => {
  it("can show the image as a thumbnail with a remove button named after it", () => {
    const markup = viewMarkup(<ImageChip name="shot.png" url="blob:shot" onRemove={vi.fn()} />)

    expect(markup).toContain('src="blob:shot"')
    expect(markup).toContain('aria-label="Remove shot.png"')
  })
})
