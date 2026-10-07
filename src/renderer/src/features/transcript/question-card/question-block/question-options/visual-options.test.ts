import { describe, expect, it } from "vitest"
import { hasVisualOptions } from "@/features/transcript/question-card/question-block/question-options/visual-options"

describe("hasVisualOptions", () => {
  it("can tell a question with an image or a mockup option", () => {
    expect(hasVisualOptions({ id: "q1", question: "Theme?", multiSelect: false, options: [{ label: "Dark", image: "dark.png" }] })).toBe(true)
    expect(hasVisualOptions({ id: "q2", question: "Card?", multiSelect: false, options: [{ label: "Card", html: "<p></p>" }] })).toBe(true)
  })

  it("can tell a question with text options only", () => {
    expect(hasVisualOptions({ id: "q1", question: "Which?", multiSelect: false, options: [{ label: "React" }] })).toBe(false)
  })
})
