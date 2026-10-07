import { describe, expect, it } from "vitest"
import { ToolOutput, type ToolOutputProps } from "@/features/transcript/tool-chain/tool-output"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<ToolOutputProps> = {}): ToolOutputProps {
  return { images: [], output: "", isError: false, ...overrides }
}

describe("ToolOutput", () => {
  it("renders nothing without output or images", () => {
    const markup = viewMarkup(<ToolOutput {...props()} />)

    expect(markup).toBe("")
  })

  it("shows the returned images above the folded output", () => {
    const markup = viewMarkup(<ToolOutput {...props({ images: ["data:image/png;base64,AA"], output: "Saved" })} />)

    expect(markup).toContain("<img")
    expect(markup).toContain("Output")
  })

  it("folds the output behind its trigger until the reader opens it", () => {
    const markup = viewMarkup(<ToolOutput {...props({ output: "Permission denied", isError: true })} />)

    expect(markup).toContain("Output")
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain("Permission denied")
  })
})
