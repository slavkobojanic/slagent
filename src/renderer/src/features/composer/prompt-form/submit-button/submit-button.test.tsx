import { describe, expect, it, vi } from "vitest"
import { SubmitButton } from "@/features/composer/prompt-form/submit-button/submit-button"
import { viewMarkup } from "@/test/view-markup"

describe("SubmitButton", () => {
  it("can submit while no run streams", () => {
    expect(viewMarkup(<SubmitButton status="ready" disabled={false} onStop={vi.fn()} />)).toContain('aria-label="Submit"')
  })

  it("can show a stop button in place of submit while a run streams", () => {
    expect(viewMarkup(<SubmitButton status="streaming" disabled={false} onStop={vi.fn()} />)).toContain('aria-label="Stop"')
  })

  it("can disable the button while the box is closed", () => {
    expect(viewMarkup(<SubmitButton status="ready" disabled onStop={vi.fn()} />)).toContain('disabled=""')
  })
})
