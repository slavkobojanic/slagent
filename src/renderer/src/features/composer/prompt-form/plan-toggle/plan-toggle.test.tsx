import { describe, expect, it, vi } from "vitest"
import { PlanToggle } from "@/features/composer/prompt-form/plan-toggle/plan-toggle"
import { viewMarkup } from "@/test/view-markup"

describe("PlanToggle", () => {
  it("can show the toggle as pressed in plan mode", () => {
    expect(viewMarkup(<PlanToggle planMode disabled={false} onToggle={vi.fn()} />)).toContain('aria-pressed="true"')
  })

  it("can show the toggle as released outside plan mode", () => {
    expect(viewMarkup(<PlanToggle planMode={false} disabled={false} onToggle={vi.fn()} />)).toContain('aria-pressed="false"')
  })

  it("can disable the toggle", () => {
    expect(viewMarkup(<PlanToggle planMode={false} disabled onToggle={vi.fn()} />)).toContain('disabled=""')
  })
})
