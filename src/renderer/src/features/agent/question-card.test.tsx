import { describe, expect, it } from "vitest"
import type { Question } from "@shared/types"
import { QuestionCard, type QuestionCardProps } from "@/features/agent/question-card"
import { viewMarkup } from "@/test/view-markup"

const question: Question = {
  id: "q1",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

const nothing = () => {}

function props(overrides: Partial<QuestionCardProps> = {}): QuestionCardProps {
  return {
    question,
    index: 0,
    count: 1,
    selected: [],
    other: "",
    ready: false,
    stepReady: false,
    hasPrevious: false,
    hasNext: false,
    direction: 1,
    open: true,
    busy: false,
    error: null,
    theme: "dark",
    frameHeights: {},
    brokenImages: {},
    zoomed: false,
    attachQuestion: nothing,
    onKey: () => false,
    onToggleOpen: nothing,
    onSkip: nothing,
    onBack: nothing,
    onNext: nothing,
    onSend: nothing,
    onPick: nothing,
    onOtherChange: nothing,
    onImageError: nothing,
    onZoomChange: nothing,
    ...overrides,
  }
}

describe("QuestionCard", () => {
  it("can show a single question without a position badge", () => {
    const markup = viewMarkup(<QuestionCard {...props()} />)

    expect(markup).toContain("Which library?")
    expect(markup).not.toContain("1/1")
  })

  it("can show its position and Next when the request has several questions", () => {
    const markup = viewMarkup(<QuestionCard {...props({ count: 2, hasNext: true, stepReady: true })} />)

    expect(markup).toContain("1/2")
    expect(markup).toContain("Next")
    expect(markup).not.toContain("Back")
  })

  it("can show Back and Send on the last question", () => {
    const markup = viewMarkup(<QuestionCard {...props({ index: 1, count: 2, hasPrevious: true, ready: true })} />)

    expect(markup).toContain("2/2")
    expect(markup).toContain("Back")
    expect(markup).toContain("Send")
    expect(markup).not.toContain("Next")
  })

  it("can disable Send until every question is answered", () => {
    const markup = viewMarkup(<QuestionCard {...props({ ready: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send</)
  })

  it("can disable the footer buttons while a reply is sending", () => {
    const markup = viewMarkup(<QuestionCard {...props({ ready: true, busy: true })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send</)
    expect(markup).toMatch(/disabled=""[^>]*>Skip</)
  })

  it("can show the expand button when the card is collapsed", () => {
    const markup = viewMarkup(<QuestionCard {...props({ open: false })} />)

    expect(markup).toContain('aria-label="Expand"')
  })

  it("can show the error when a reply failed", () => {
    const markup = viewMarkup(<QuestionCard {...props({ error: "Network down" })} />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Network down")
  })
})
