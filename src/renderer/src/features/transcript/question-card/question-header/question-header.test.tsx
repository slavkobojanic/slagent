import { describe, expect, it } from "vitest"
import { QuestionHeader, type QuestionHeaderProps } from "@/features/transcript/question-card/question-header/question-header"
import { viewMarkup } from "@/test/view-markup"

const nothing = () => {}

function props(overrides: Partial<QuestionHeaderProps> = {}): QuestionHeaderProps {
  return {
    question: "Which library?",
    open: true,
    busy: false,
    onToggleOpen: nothing,
    onSkip: nothing,
    ...overrides,
  }
}

describe("QuestionHeader", () => {
  it("can show the question", () => {
    const markup = viewMarkup(<QuestionHeader {...props()} />)

    expect(markup).toContain("Which library?")
  })

  it("can show the expand button when the card is collapsed", () => {
    const markup = viewMarkup(<QuestionHeader {...props({ open: false })} />)

    expect(markup).toContain('aria-label="Expand"')
  })
})
