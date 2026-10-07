import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { RightPanel, type RightPanelProps } from "@/features/changes/right-panel"

function panel(overrides: Partial<RightPanelProps> = {}): RightPanelProps {
  return {
    resizing: false,
    showing: "changes",
    file: null,
    hasPlan: false,
    body: <p>The diff</p>,
    onTab: vi.fn(),
    onCloseFile: vi.fn(),
    onClose: vi.fn(),
    onResizeStart: vi.fn(),
    onResizeReset: vi.fn(),
    ...overrides,
  }
}

describe("RightPanel", () => {
  it("can render as an aside with the changes tab selected and no plan or file tab", () => {
    const markup = viewMarkup(<RightPanel {...panel()} />)

    expect(markup.startsWith('<aside class="relative')).toBe(true)
    expect(markup).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*Changes/)
    expect(markup).not.toContain("Plan")
    expect(markup).not.toContain('aria-label="Close file"')
  })

  it("can render the resize handle inside the aside, before the tab strip", () => {
    const markup = viewMarkup(<RightPanel {...panel()} />)

    expect(markup.indexOf('role="separator"')).toBeGreaterThan(markup.indexOf("<aside"))
    expect(markup.indexOf('role="separator"')).toBeLessThan(markup.indexOf('role="tablist"'))
  })

  it("can mark the resize handle while the pane is being dragged", () => {
    const markup = viewMarkup(<RightPanel {...panel({ resizing: true })} />)

    expect(markup).toMatch(/role="separator"[^>]*data-resizing="true"/)
  })

  it("can show the plan tab when the run has a plan, and select it while the plan shows", () => {
    const markup = viewMarkup(<RightPanel {...panel({ showing: "plan", hasPlan: true, body: <p>The plan</p> })} />)

    expect(markup).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*Plan/)
    expect(markup).toContain("The plan")
  })

  it("can show the open file's tab with its name, its full path and a close button", () => {
    const markup = viewMarkup(<RightPanel {...panel({ showing: "file", file: { name: "app.ts", path: "src/app.ts" }, body: <p>File body</p> })} />)

    expect(markup).toContain(">app.ts<")
    expect(markup).toContain('title="src/app.ts"')
    expect(markup).toContain('aria-label="Close file"')
    expect(markup).toContain("File body")
  })
})
