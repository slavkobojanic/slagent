import { describe, expect, it, vi } from "vitest"
import { EffortSwitcher } from "@/features/composer/prompt-form/effort-switcher/effort-switcher"
import { viewMarkup } from "@/test/view-markup"

describe("EffortSwitcher", () => {
  it("can label the trigger with the active level", () => {
    expect(viewMarkup(<EffortSwitcher effort="high" onValueChange={vi.fn()} />)).toContain('aria-label="Reasoning effort: High"')
  })

  it("can fall back to medium for an unknown level", () => {
    expect(viewMarkup(<EffortSwitcher effort={"unknown" as never} onValueChange={vi.fn()} />)).toContain('aria-label="Reasoning effort: Medium"')
  })
})