import { describe, expect, it } from "vitest"
import { QuestionFooter, type QuestionFooterProps } from "@/features/transcript/question-card/question-footer/question-footer"
import { viewMarkup } from "@/test/view-markup"

const nothing = () => {}

function props(overrides: Partial<QuestionFooterProps> = {}): QuestionFooterProps {
  return {
    index: 0,
    count: 1,
    hasPrevious: false,
    hasNext: false,
    busy: false,
    stepReady: false,
    ready: false,
    onBack: nothing,
    onSkip: nothing,
    onNext: nothing,
    onSend: nothing,
    ...overrides,
  }
}

describe("QuestionFooter", () => {
  it("can show Next when more questions follow", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ hasNext: true, stepReady: true })} />)

    expect(markup).toContain("Next")
    expect(markup).not.toContain("Back")
  })

  it("can show Back and Send on the last question", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ hasPrevious: true, ready: true })} />)

    expect(markup).toContain("Back")
    expect(markup).toContain("Send")
    expect(markup).not.toContain("Next")
  })

  it("can disable Send until every question is answered", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ ready: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send</)
  })

  it("can disable the buttons while a reply is sending", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ ready: true, busy: true })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send</)
    expect(markup).toMatch(/disabled=""[^>]*>Skip</)
  })

  it("can show its position left of Skip when the request has several questions", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ index: 1, count: 3 })} />)

    expect(markup).toContain("2 / 3")
  })

  it("can hide the position for a single question", () => {
    const markup = viewMarkup(<QuestionFooter {...props({ index: 0, count: 1 })} />)

    expect(markup).not.toContain("1 / 1")
  })
})
