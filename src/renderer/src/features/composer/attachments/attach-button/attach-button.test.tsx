import { describe, expect, it, vi } from "vitest"
import { AttachButton } from "@/features/composer/attachments/attach-button/attach-button"
import { viewMarkup } from "@/test/view-markup"

describe("AttachButton", () => {
  it("can render a labelled button that opens the file picker", () => {
    expect(viewMarkup(<AttachButton onAttach={vi.fn()} />)).toContain('aria-label="Attach files"')
  })
})
