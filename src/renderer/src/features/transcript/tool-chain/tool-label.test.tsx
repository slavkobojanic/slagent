import { describe, expect, it } from "vitest"
import { ToolLabel, type ToolLabelProps } from "@/features/transcript/tool-chain/tool-label"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<ToolLabelProps> = {}): ToolLabelProps {
  return { text: "Ran command", file: null, onOpenFile: noop, ...overrides }
}

describe("ToolLabel", () => {
  it("shows the sentence for a step that is not about a file", () => {
    const markup = viewMarkup(<ToolLabel {...props()} />)

    expect(markup).toBe("Ran command")
  })

  it("shows the tool name and its file as a button that opens the file", () => {
    const markup = viewMarkup(<ToolLabel {...props({ text: "", file: { name: "read", path: "src/app.ts:12" } })} />)

    expect(markup).toContain("read")
    expect(markup).toContain('title="View file"')
    expect(markup).toContain("src/app.ts:12")
  })
})
