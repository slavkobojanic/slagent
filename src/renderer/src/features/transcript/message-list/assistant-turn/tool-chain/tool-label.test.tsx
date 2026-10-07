import { describe, expect, it } from "vitest"
import { ToolLabel } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-label"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("ToolLabel", () => {
  it("shows the sentence for a step that is not about a file", () => {
    const markup = viewMarkup(<ToolLabel label={{ kind: "text", text: "Ran command" }} onOpenFile={noop} />)

    expect(markup).toBe("Ran command")
  })

  it("shows the tool name and its file as a button that opens the file", () => {
    const markup = viewMarkup(<ToolLabel label={{ kind: "file", name: "read", path: "src/app.ts:12" }} onOpenFile={noop} />)

    expect(markup).toContain("read")
    expect(markup).toContain('title="View file"')
    expect(markup).toContain("src/app.ts:12")
  })
})
