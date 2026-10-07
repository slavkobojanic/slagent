import { describe, expect, it } from "vitest"
import type { Question } from "@shared/types"
import { QuestionOptions, type QuestionOptionsProps } from "@/features/transcript/question-card/question-block/question-options/question-options"
import { viewMarkup } from "@/test/view-markup"

const plain: Question = {
  id: "q1",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

function HtmlFrame({ frameKey }: { html: string; title: string; frameKey: string }) {
  return <iframe title={frameKey} sandbox="allow-scripts" />
}

function props(overrides: Partial<QuestionOptionsProps> = {}): QuestionOptionsProps {
  return { question: plain, selected: [], visual: false, HtmlFrame, onPick: () => {}, ...overrides }
}

describe("QuestionOptions", () => {
  it("can show options as numbered rows when no option has a preview", () => {
    const markup = viewMarkup(<QuestionOptions {...props()} />)

    expect(markup).toContain('role="radiogroup"')
    expect(markup).toContain("React")
    expect(markup).toContain("Vue")
    expect(markup).not.toContain("No preview")
  })

  it("can show options as preview cards when an option has an image", () => {
    const visual: Question = { ...plain, options: [{ label: "Dark", image: "dark.png" }] }

    const markup = viewMarkup(<QuestionOptions {...props({ question: visual, visual: true })} />)

    expect(markup).toContain('src="dark.png"')
    expect(markup).toContain('alt="Dark"')
  })

  it("can show a mockup option in a frame keyed by the option", () => {
    const visual: Question = { ...plain, options: [{ label: "Card", html: "<p>Card</p>" }] }

    const markup = viewMarkup(<QuestionOptions {...props({ question: visual, visual: true })} />)

    expect(markup).toContain('sandbox="allow-scripts"')
    expect(markup).toContain('title="q1:option:Card"')
  })

  it("can mark the picked option as checked", () => {
    const markup = viewMarkup(<QuestionOptions {...props({ selected: ["React"] })} />)

    expect(markup).toContain('aria-checked="true"')
  })

  it("can show a recommended badge on an option", () => {
    const recommended: Question = { ...plain, options: [{ label: "React", recommended: true }] }

    const markup = viewMarkup(<QuestionOptions {...props({ question: recommended })} />)

    expect(markup).toContain("Recommended")
  })
})
