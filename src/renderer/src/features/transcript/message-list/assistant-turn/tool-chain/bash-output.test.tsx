import { fireEvent, render } from "@testing-library/react"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"
import { BashOutput, type BashOutputProps } from "@/features/transcript/message-list/assistant-turn/tool-chain/bash-output"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<BashOutputProps> = {}): BashOutputProps {
  return { command: "npm test", output: "", running: false, isError: false, ...overrides }
}

function rerender(view: ReturnType<typeof render>, element: ReactElement) {
  view.rerender(element)
}

describe("BashOutput", () => {
  it("shows the command and that it is still running while there is no output", () => {
    const markup = viewMarkup(<BashOutput {...props({ running: true })} />)

    expect(markup).toContain("npm test")
    expect(markup).toContain("Running…")
  })

  it("shows the output of a finished command", () => {
    const markup = viewMarkup(<BashOutput {...props({ output: "All tests passed" })} />)

    expect(markup).toContain("All tests passed")
    expect(markup).not.toContain("Running…")
  })

  it("shows the output of a failed command in the destructive colour", () => {
    const markup = viewMarkup(<BashOutput {...props({ output: "1 test failed", isError: true })} />)

    expect(markup).toContain("1 test failed")
    expect(markup).toContain("text-destructive")
  })

  it("collapses when a running command completes", () => {
    const view = render(<BashOutput {...props({ running: true })} />)
    rerender(view, <BashOutput {...props({ output: "All tests passed" })} />)

    expect(view.container.innerHTML).not.toContain("All tests passed")
  })

  it("keeps the output of a failed command open", () => {
    const view = render(<BashOutput {...props({ running: true })} />)
    rerender(view, <BashOutput {...props({ output: "1 test failed", isError: true })} />)

    expect(view.container.innerHTML).toContain("1 test failed")
  })

  it("expands a collapsed run when you click the command", async () => {
    const view = render(<BashOutput {...props({ running: true })} />)
    rerender(view, <BashOutput {...props({ output: "All tests passed" })} />)

    fireEvent.click(view.container.querySelector("button")!)

    expect(view.container.innerHTML).toContain("All tests passed")
  })
})