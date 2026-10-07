import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { DiffPanel, type DiffPanelProps } from "./diff-panel"

function panel(overrides: Partial<DiffPanelProps> = {}): DiffPanelProps {
  return {
    branch: "main",
    scope: "uncommitted",
    loading: false,
    DiffFiles: () => <p>The files</p>,
    DiffFooter: () => <div>Commit box</div>,
    onScope: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
}

describe("DiffPanel", () => {
  it("can show the files and the commit box", () => {
    const markup = viewMarkup(<DiffPanel {...panel()} />)

    expect(markup).toContain("The files")
    expect(markup).toContain("Commit box")
  })

  it("can show the branch and press the scope that is shown", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ scope: "turn" })} />)

    expect(markup).toContain(">main<")
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Last turn</)
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Uncommitted</)
  })

  it("can spin the refresh icon while the diff loads", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ loading: true })} />)

    expect(markup).toContain("animate-spin")
  })
})
