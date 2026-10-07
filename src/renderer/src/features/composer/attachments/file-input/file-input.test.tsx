import { describe, expect, it, vi } from "vitest"
import { FileInput } from "@/features/composer/attachments/file-input/file-input"
import { viewMarkup } from "@/test/view-markup"

describe("FileInput", () => {
  it("can render a hidden picker that takes several files", () => {
    const markup = viewMarkup(<FileInput attach={vi.fn()} onChange={vi.fn()} />)

    expect(markup).toContain('type="file"')
    expect(markup).toContain("multiple")
    expect(markup).toContain('class="hidden"')
  })
})
