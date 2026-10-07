import { describe, expect, it } from "vitest"
import { OtherRow, type OtherRowProps } from "@/features/transcript/question-card/question-block/other-row/other-row"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<OtherRowProps> = {}): OtherRowProps {
  return { multiSelect: false, optionCount: 2, other: "", onChange: () => {}, ...overrides }
}

describe("OtherRow", () => {
  it("can show the reply row with its typed text", () => {
    const markup = viewMarkup(<OtherRow {...props({ other: "Svelte" })} />)

    expect(markup).toContain('value="Svelte"')
  })

  it("can number the reply row after the options on a single-choice question", () => {
    const markup = viewMarkup(<OtherRow {...props()} />)

    expect(markup).toContain(">3<")
  })

  it("can use the optional placeholder on a multi-select question", () => {
    const markup = viewMarkup(<OtherRow {...props({ multiSelect: true })} />)

    expect(markup).toContain("Type your own answer (optional)")
  })
})
