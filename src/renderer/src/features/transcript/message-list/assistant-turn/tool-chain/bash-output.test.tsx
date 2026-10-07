import { describe, expect, it } from "vitest"
import { BashOutput, type BashOutputProps } from "@/features/transcript/message-list/assistant-turn/tool-chain/bash-output"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<BashOutputProps> = {}): BashOutputProps {
  return { command: "npm test", output: "", running: false, isError: false, ...overrides }
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
})