import { describe, expect, it, vi } from "vitest"
import type { TerminalChip } from "@/features/terminal/terminal-bar/terminal-bar"
import { TerminalBar, type TerminalBarProps } from "@/features/terminal/terminal-bar/terminal-bar"
import { viewMarkup } from "@/test/view-markup"

const chip: TerminalChip = { id: "terminal-1", title: "zsh", active: true, exited: false, origin: "user", color: null }
const task: TerminalChip = { id: "task-1", title: "dev server", active: false, exited: false, origin: "task", color: "#3b82f6" }

function base(overrides: Partial<TerminalBarProps> = {}): TerminalBarProps {
  return {
    chips: [],
    open: false,
    canCreate: true,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onCreate: vi.fn(),
    onToggle: vi.fn(),
    ...overrides,
  }
}

describe("TerminalBar", () => {
  it("can stay at the bottom while nothing runs", () => {
    const html = viewMarkup(<TerminalBar {...base()} />)

    expect(html).toContain("No terminals")
  })

  it("can list every terminal in one row of mono chips", () => {
    const html = viewMarkup(<TerminalBar {...base({ chips: [chip, task] })} />)

    expect(html).toContain(">zsh</span>")
    expect(html).toContain(">dev server</span>")
    expect(html).toContain("font-mono")
  })

  it("can mark the active chip and tint it with the project colour", () => {
    const html = viewMarkup(<TerminalBar {...base({ chips: [{ ...task, active: true }] })} />)

    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"/)
    expect(html).toContain("rgb(59, 130, 246)")
  })

  it("can keep the close button visible without a hover background", () => {
    const html = viewMarkup(<TerminalBar {...base({ chips: [chip] })} />)

    expect(html).toContain('aria-label="Close zsh"')
    expect(html).not.toContain("group-hover:opacity")
    expect(html).not.toContain("hover:bg-white/10")
  })

  it("can ellipse a long command and show the full one on hover", () => {
    const long: TerminalChip = { id: "task-9", title: "pnpm storybook dev -p 6006 --ci", active: false, exited: false, origin: "task", color: null }
    const html = viewMarkup(<TerminalBar {...base({ chips: [long] })} />)

    expect(html).toContain("pnpm storybook dev …")
    expect(html).toContain('title="pnpm storybook dev -p 6006 --ci"')
  })

  it("can dim an exited chip", () => {
    const html = viewMarkup(<TerminalBar {...base({ chips: [{ ...chip, active: false, exited: true }] })} />)

    expect(html).toContain("opacity-50")
  })

  it("can offer the new-shell and drawer-toggle controls", () => {
    const html = viewMarkup(<TerminalBar {...base()} />)

    expect(html).toContain('aria-label="New terminal tab"')
    expect(html).toContain('aria-label="Show terminal"')
  })

  it("can refuse a new shell while one is spawning", () => {
    const html = viewMarkup(<TerminalBar {...base({ canCreate: false })} />)

    expect(html).toContain("disabled")
  })

  it("can mark the drawer as open in the toggle control", () => {
    const html = viewMarkup(<TerminalBar {...base({ open: true })} />)

    expect(html).toContain('aria-label="Hide terminal"')
    expect(html).toContain('aria-pressed="true"')
  })

  it("can show the branch to the right of the drawer toggle", () => {
    const html = viewMarkup(<TerminalBar {...base({ branch: <span className="font-mono">feat-status-bar</span> })} />)

    expect(html).toContain("feat-status-bar")
    expect(html).toContain('aria-label="Show terminal"')
    expect(html).toContain("font-mono")
  })
})
