import { describe, expect, it } from "vitest"
import { QuestionHeader, type QuestionHeaderProps } from "@/features/transcript/question-card/question-header/question-header"
import { viewMarkup } from "@/test/view-markup"

const nothing = () => {}

function props(overrides: Partial<QuestionHeaderProps> = {}): QuestionHeaderProps {
  return {
    header: undefined,
    question: "Which library?",
    open: true,
    busy: false,
    onToggleOpen: nothing,
    onSkip: nothing,
    ...overrides,
  }
}

describe("QuestionHeader", () => {
  it("can show a single question without a position badge", () => {
    const markup = viewMarkup(<QuestionHeader {...props()} />)

    expect(markup).toContain("Which library?")
    expect(markup).not.toContain("1/1")
  })

  it("leaves the position to the footer", () => {
    const markup = viewMarkup(<QuestionHeader {...props({ header: "Stack" })} />)

    expect(markup).toContain("Stack")
    expect(markup).not.toContain("1/3")
  })

  it("can show the question's header", () => {
    const markup = viewMarkup(<QuestionHeader {...props({ header: "Stack" })} />)

    expect(markup).toContain("Stack")
  })

  it("can show the expand button when the card is collapsed", () => {
    const markup = viewMarkup(<QuestionHeader {...props({ open: false })} />)

    expect(markup).toContain('aria-label="Expand"')
  })
})
