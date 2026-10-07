import { describe, expect, it, vi } from "vitest"
import { NameChip } from "@/features/composer/attachments/name-chip/name-chip"
import { viewMarkup } from "@/test/view-markup"

describe("NameChip", () => {
  it("can show the file name with a remove button named after it", () => {
    const markup = viewMarkup(<NameChip name="spec.pdf" onRemove={vi.fn()} />)

    expect(markup).toContain("spec.pdf")
    expect(markup).toContain('aria-label="Remove spec.pdf"')
  })
})
