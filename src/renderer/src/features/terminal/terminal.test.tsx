import { describe, expect, it, vi } from "vitest"
import { Terminal, type TerminalPane, type TerminalProps } from "./terminal"
import { viewMarkup } from "@/test/view-markup"

function pane(id: string): TerminalPane {
  return {
    id,
    groupId: null,
    surface: (
      <div data-testid={`surface-${id}`}>
        {id} surface
      </div>
    ),
  }
}

function props(overrides: Partial<TerminalProps> = {}): TerminalProps {
  return {
    open: true,
    height: 288,
    resizing: false,
    panes: [],
    hiddenSurfaces: [],
    splitRatio: () => 0.5,
    error: null,
    onPaneSelect: vi.fn(),
    onMenuSplit: vi.fn(),
    onMenuRename: vi.fn(),
    onMenuClose: vi.fn(),
    onDividerStart: vi.fn(),
    onResizeStart: vi.fn(),
    onResizeReset: vi.fn(),
    ...overrides,
  }
}

describe("Terminal", () => {
  it("can size the drawer from the stored height", () => {
    const markup = viewMarkup(<Terminal {...props({ height: 360 })} />)

    expect(markup).toMatch(/--terminal-height:\s*360px/)
    expect(markup).not.toContain("data-closed")
  })

  it("can collapse the drawer and take its rows out of the tab order when closed", () => {
    const markup = viewMarkup(<Terminal {...props({ open: false })} />)

    expect(markup).toContain('data-closed="true"')
    expect(markup).toContain('inert=""')
  })

  it("can show the shell of the open tab as one full-width pane", () => {
    const markup = viewMarkup(<Terminal {...props({ panes: [pane("a")] })} />)

    expect(markup).toContain("a surface")
    expect(markup).toContain('data-pane="a"')
    expect(markup).not.toContain('aria-label="Resize split"')
  })

  it("can show a group's shells side by side with a divider between them", () => {
    const panes = [
      { ...pane("a"), groupId: "g1" },
      { ...pane("b"), groupId: "g1" },
    ]
    const markup = viewMarkup(<Terminal {...props({ panes })} />)

    expect(markup).toContain("a surface")
    expect(markup).toContain("b surface")
    expect(markup).toContain('aria-label="Resize split"')
  })

  it("can size the first pane of a group from the group's ratio", () => {
    const panes = [
      { ...pane("a"), groupId: "g1" },
      { ...pane("b"), groupId: "g1" },
    ]
    const markup = viewMarkup(<Terminal {...props({ panes, splitRatio: () => 0.6 })} />)

    expect(markup).toMatch(/flex:\s*0 0 60%/)
  })

  it("can keep the surfaces of tabs outside the visible group mounted but hidden", () => {
    const markup = viewMarkup(<Terminal {...props({ panes: [pane("a")], hiddenSurfaces: [<div key="c">c surface</div>] })} />)

    expect(markup).toContain("c surface")
    expect(markup).not.toContain('data-pane="c"')
  })

  it("can show that a shell is starting when no tab is open yet", () => {
    const markup = viewMarkup(<Terminal {...props()} />)

    expect(markup).toContain("Starting a shell")
  })

  it("can show the error instead of the panes when a shell cannot start", () => {
    const markup = viewMarkup(<Terminal {...props({ panes: [pane("a")], error: "no shell" })} />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("no shell")
    expect(markup).not.toContain("a surface")
  })

  it("can mark the drawer as resizing while the handle is dragged", () => {
    const markup = viewMarkup(<Terminal {...props({ resizing: true })} />)

    expect(markup).toContain('data-resizing="true"')
  })

  it("can offer a resize handle for the drawer", () => {
    const markup = viewMarkup(<Terminal {...props()} />)

    expect(markup).toContain('aria-label="Resize terminal"')
  })
})
