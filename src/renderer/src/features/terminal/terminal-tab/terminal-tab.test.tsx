import { describe, expect, it, vi } from "vitest"
import { TerminalTab, type TerminalTabProps } from "@/features/terminal/terminal-tab/terminal-tab"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<TerminalTabProps> = {}): TerminalTabProps {
  return {
    title: "zsh",
    active: false,
    exited: false,
    origin: "user",
    color: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe("TerminalTab", () => {
  it("can mark the tab of the shell on screen", () => {
    const markup = viewMarkup(<TerminalTab {...props({ active: true })} />)

    expect(markup).toMatch(/role="tab"[^>]*aria-selected="true"/)
    expect(markup).not.toContain("rounded-full")
  })

  it("can leave the other tabs unselected", () => {
    const markup = viewMarkup(<TerminalTab {...props({ title: "bash" })} />)

    expect(markup).toMatch(/role="tab"[^>]*aria-selected="false"/)
    expect(markup).toContain(">bash<")
  })

  it("can show that the shell behind the tab has quit", () => {
    const markup = viewMarkup(<TerminalTab {...props({ exited: true, title: "zsh" })} />)

    expect(markup).toContain("rounded-full")
    expect(markup).toContain('title="zsh (exited)"')
  })

  it("can tint the dot of a task tab with the project colour", () => {
    const markup = viewMarkup(<TerminalTab {...props({ origin: "task", color: "#22c55e" })} />)

    expect(markup).toContain("rounded-full")
    expect(markup).toContain("rgb(34, 197, 94)")
  })

  it("can offer a close button named after the tab", () => {
    const markup = viewMarkup(<TerminalTab {...props({ title: "bash" })} />)

    expect(markup).toContain('aria-label="Close bash"')
  })
})
