import { describe, expect, it } from "vitest"
import { TerminalIcon } from "lucide-react"
import { ToolChain, type ToolChainProps } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-chain"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<ToolChainProps> = {}): ToolChainProps {
  return {
    steps: [
      { id: "t1", icon: TerminalIcon, label: "Ran command", active: false, error: false, output: <span>ok</span> },
      { id: "t2", icon: TerminalIcon, label: "Running command", active: true, error: false, output: null },
    ],
    ...overrides,
  }
}

describe("ToolChain", () => {
  it("lists each step under the Tools header with its label and output", () => {
    const markup = viewMarkup(<ToolChain {...props()} />)

    expect(markup).toContain("Tools")
    expect(markup).toContain("Ran command")
    expect(markup).toContain("Running command")
    expect(markup).toContain("ok")
  })

  it("shows a failed step in the destructive colour", () => {
    const markup = viewMarkup(
      <ToolChain {...props({ steps: [{ id: "t1", icon: TerminalIcon, label: "Command failed", active: false, error: true, output: null }] })} />,
    )

    expect(markup).toContain("Command failed")
    expect(markup).toContain("text-destructive")
  })
})
