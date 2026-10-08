import { describe, expect, it, vi } from "vitest"
import { TerminalView, type TerminalViewProps } from "@/features/terminal/terminal-view/terminal-view"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<TerminalViewProps> = {}): TerminalViewProps {
  return { active: true, onAttach: vi.fn(), ...overrides }
}

describe("TerminalView", () => {
  it("can show the surface of the shell on screen", () => {
    const markup = viewMarkup(<TerminalView {...props()} />)

    expect(markup).toContain('data-active="true"')
    expect(markup).toContain("visible")
  })

  it("can hide the surface of a background tab without unmounting it", () => {
    const markup = viewMarkup(<TerminalView {...props({ active: false })} />)

    expect(markup).not.toContain("data-active")
    expect(markup).toContain("invisible")
  })

  it("can hand the surface element to the presenter", () => {
    const onAttach = vi.fn()

    viewMarkup(<TerminalView {...props({ onAttach })} />)

    expect(onAttach).toHaveBeenCalledWith(expect.any(HTMLDivElement))
  })
})
