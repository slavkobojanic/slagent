import { describe, expect, it } from "vitest"
import { StatusDot } from "@/features/shell/shell-header/project-menu/status-dot/status-dot"
import { viewMarkup } from "@/test/view-markup"

describe("StatusDot", () => {
  it("can label a running project as working", () => {
    const markup = viewMarkup(<StatusDot status="running" />)

    expect(markup).toContain('aria-label="Working"')
    expect(markup).toContain("animate-pulse")
  })

  it("can label a finished project", () => {
    const markup = viewMarkup(<StatusDot status="done" />)

    expect(markup).toContain('aria-label="Finished"')
  })

  it("can leave an idle project's dot unlabelled", () => {
    const markup = viewMarkup(<StatusDot status="idle" />)

    expect(markup).not.toContain("aria-label")
    expect(markup).not.toContain('role="img"')
  })
})
