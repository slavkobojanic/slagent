import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { Changes, type ChangesProps } from "./changes"

function panel(overrides: Partial<ChangesProps> = {}): ChangesProps {
  return {
    resizing: false,
    showing: "changes",
    Tabs: () => <div role="tablist">Tabs</div>,
    DiffPanel: () => <p>The diff</p>,
    FileViewer: () => <p>File body</p>,
    PlanDocument: () => <p>The plan</p>,
    onResizeStart: vi.fn(),
    onResizeReset: vi.fn(),
    ...overrides,
  }
}

describe("Changes", () => {
  it("can render as an aside with the tabs and the diff", () => {
    const markup = viewMarkup(<Changes {...panel()} />)

    expect(markup.startsWith('<aside class="relative')).toBe(true)
    expect(markup).toContain('role="tablist"')
    expect(markup).toContain("The diff")
    expect(markup).not.toContain("The plan")
    expect(markup).not.toContain("File body")
  })

  it("can render the resize handle inside the aside, before the tab strip", () => {
    const markup = viewMarkup(<Changes {...panel()} />)

    expect(markup.indexOf('role="separator"')).toBeGreaterThan(markup.indexOf("<aside"))
    expect(markup.indexOf('role="separator"')).toBeLessThan(markup.indexOf('role="tablist"'))
  })

  it("can mark the resize handle while the pane is being dragged", () => {
    const markup = viewMarkup(<Changes {...panel({ resizing: true })} />)

    expect(markup).toMatch(/role="separator"[^>]*data-resizing="true"/)
  })

  it("can show the plan while the plan tab shows", () => {
    const markup = viewMarkup(<Changes {...panel({ showing: "plan" })} />)

    expect(markup).toContain("The plan")
    expect(markup).not.toContain("The diff")
  })

  it("can show the open file while the file tab shows", () => {
    const markup = viewMarkup(<Changes {...panel({ showing: "file" })} />)

    expect(markup).toContain("File body")
    expect(markup).not.toContain("The diff")
  })
})
