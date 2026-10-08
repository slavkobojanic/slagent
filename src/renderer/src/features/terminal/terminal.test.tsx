import { describe, expect, it, vi } from "vitest"
import { Terminal, type TerminalProps } from "./terminal"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<TerminalProps> = {}): TerminalProps {
  return {
    open: true,
    height: 288,
    resizing: false,
    tabs: [],
    surfaces: [],
    empty: true,
    error: null,
    canCreate: true,
    onCreate: vi.fn(),
    onClose: vi.fn(),
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

  it("can show the tabs and the surfaces of the open shells", () => {
    const markup = viewMarkup(
      <Terminal
        {...props({
          empty: false,
          tabs: [<div key="a">first tab</div>],
          surfaces: [<div key="a">first surface</div>],
        })}
      />,
    )

    expect(markup).toContain("first tab")
    expect(markup).toContain("first surface")
  })

  it("can show that a shell is starting when no tab is open yet", () => {
    const markup = viewMarkup(<Terminal {...props()} />)

    expect(markup).toContain("Starting a shell")
  })

  it("can show the error instead of the surfaces when a shell cannot start", () => {
    const markup = viewMarkup(<Terminal {...props({ empty: false, error: "no shell" })} />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("no shell")
  })

  it("can refuse a new tab while one is spawning", () => {
    const markup = viewMarkup(<Terminal {...props({ canCreate: false })} />)

    expect(markup).toContain('aria-label="New terminal tab"')
    expect(markup).toContain("disabled")
  })

  it("can mark the drawer as resizing while the handle is dragged", () => {
    const markup = viewMarkup(<Terminal {...props({ resizing: true })} />)

    expect(markup).toContain('data-resizing="true"')
  })

  it("can offer a close button for the drawer", () => {
    const markup = viewMarkup(<Terminal {...props()} />)

    expect(markup).toContain('aria-label="Hide terminal"')
    expect(markup).toContain('aria-label="Resize terminal"')
  })
})
