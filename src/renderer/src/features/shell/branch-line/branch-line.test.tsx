import { describe, expect, it } from "vitest"
import { BranchLine } from "@/features/shell/branch-line/branch-line"
import { viewMarkup } from "@/test/view-markup"

describe("BranchLine", () => {
  it("can show a short branch name in the mono font", () => {
    const html = viewMarkup(<BranchLine label="main" />)

    expect(html).toContain("font-mono")
    expect(html).toContain(">main<")
    expect(html).toContain("title=\"Current branch\"")
  })

  it("can ellipsize a long branch name at 20 characters", () => {
    const html = viewMarkup(<BranchLine label="feat-status-bar-and-project-appearance" />)

    expect(html).toContain("feat-status-bar-and")
    expect(html).toContain("\u2026")
    expect(html).not.toContain("project-appearance")
  })

  it("can offer the full name in a hover popover", () => {
    const html = viewMarkup(<BranchLine label="feat-status-bar-and-project-appearance" />)

    expect(html).toContain('data-slot="hover-card-trigger"')
    expect(html).toContain('title="Current branch"')
  })
})
