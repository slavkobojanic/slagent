import { fireEvent, render } from "@testing-library/react"
import { TerminalIcon } from "lucide-react"
import { describe, expect, it } from "vitest"
import { ToolChain, type ToolChainProps } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-chain"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<ToolChainProps> = {}): ToolChainProps {
  return {
    steps: [
      { id: "t1", icon: TerminalIcon, label: "Ran command", active: false, error: false, output: <span>step body</span> },
      { id: "t2", icon: TerminalIcon, label: "Running command", active: true, error: false, output: null },
    ],
    defaultOpen: true,
    ...overrides,
  }
}

describe("ToolChain", () => {
  it("lists each step under the Tools header with its label", () => {
    const markup = viewMarkup(<ToolChain {...props()} />)

    expect(markup).toContain("Tools")
    expect(markup).toContain("Ran command")
    expect(markup).toContain("Running command")
  })

  it("collapses the steps when it starts closed", () => {
    const markup = viewMarkup(<ToolChain {...props({ defaultOpen: false })} />)

    expect(markup).toContain("Tools")
    expect(markup).not.toContain("Ran command")
  })

  it("summarizes the steps in the header once they are described", () => {
    const markup = viewMarkup(<ToolChain {...props({ defaultOpen: false, summary: "Reading the README, listing the source files" })} />)

    expect(markup).toContain("Reading the README, listing the source files")
    expect(markup).not.toContain("Tools")
  })

  it("fades the summary in", () => {
    const markup = viewMarkup(<ToolChain {...props({ defaultOpen: false, summary: "Reading the README" })} />)

    expect(markup).toContain("animate-in")
  })

  it("shows a failed step in the destructive colour", () => {
    const markup = viewMarkup(
      <ToolChain {...props({ steps: [{ id: "t1", icon: TerminalIcon, label: "Command failed", active: false, error: true, output: null }] })} />,
    )

    expect(markup).toContain("Command failed")
    expect(markup).toContain("text-destructive")
  })

  it("hides the output of a finished step", () => {
    const markup = viewMarkup(<ToolChain {...props()} />)

    expect(markup).not.toContain("step body")
  })

  it("shows the output of a running step", () => {
    const markup = viewMarkup(
      <ToolChain {...props({ steps: [{ id: "t1", icon: TerminalIcon, label: "Running command", active: true, error: false, output: <span>step body</span> }] })} />,
    )

    expect(markup).toContain("step body")
  })

  it("keeps the output of a failed step open", () => {
    const markup = viewMarkup(
      <ToolChain {...props({ steps: [{ id: "t1", icon: TerminalIcon, label: "Command failed", active: false, error: true, output: <span>boom</span> }] })} />,
    )

    expect(markup).toContain("boom")
  })

  it("re-opens a finished step's output when you click it", () => {
    const view = render(<ToolChain {...props()} />)

    fireEvent.click(view.getByText("Ran command"))

    expect(view.container.innerHTML).toContain("step body")
  })
})