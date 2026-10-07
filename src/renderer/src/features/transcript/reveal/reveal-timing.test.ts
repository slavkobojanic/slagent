import { describe, expect, it } from "vitest"
import { blockStart, isCodeBlock, REVEAL_STEP_MS } from "@/features/transcript/reveal/reveal-timing"

describe("blockStart", () => {
  it("can show the first block at the origin", () => {
    expect(blockStart(1000, 0, 1000)).toBe(1000)
  })

  it("can show a later block at its own slot when the previous block is long gone", () => {
    expect(blockStart(1000, 2, 1000)).toBe(1000 + 2 * REVEAL_STEP_MS)
  })

  it("can wait one step after the previous block when the previous block came late", () => {
    const late = 1000 + 5 * REVEAL_STEP_MS

    expect(blockStart(1000, 1, late)).toBe(late + REVEAL_STEP_MS)
  })
})

describe("isCodeBlock", () => {
  it("can recognise a fenced code block", () => {
    expect(isCodeBlock("```ts\nconst a = 1\n```")).toBe(true)
  })

  it("can recognise a fence that is indented", () => {
    expect(isCodeBlock("   ```\ncode\n```")).toBe(true)
  })

  it("can tell a paragraph from code", () => {
    expect(isCodeBlock("Some text with ``` inside")).toBe(false)
  })
})
