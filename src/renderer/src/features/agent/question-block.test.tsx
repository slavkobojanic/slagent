import { describe, expect, it } from "vitest"
import type { Question } from "@shared/types"
import { QuestionBlock, type QuestionBlockProps } from "@/features/agent/question-block"
import { viewMarkup } from "@/test/view-markup"

const plain: Question = {
  id: "q1",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

const nothing = () => {}

function props(overrides: Partial<QuestionBlockProps> = {}): QuestionBlockProps {
  return {
    question: plain,
    selected: [],
    other: "",
    theme: "dark",
    frameHeights: {},
    brokenImages: {},
    zoomed: false,
    attachQuestion: nothing,
    onPick: nothing,
    onOtherChange: nothing,
    onImageError: nothing,
    onZoomChange: nothing,
    ...overrides,
  }
}

describe("QuestionBlock", () => {
  it("can show options as numbered rows when no option has a preview", () => {
    const markup = viewMarkup(<QuestionBlock {...props()} />)

    expect(markup).toContain('role="radiogroup"')
    expect(markup).toContain("React")
    expect(markup).toContain("Vue")
    expect(markup).not.toContain("No preview")
  })

  it("can show options as preview cards when an option has an image", () => {
    const visual: Question = { ...plain, options: [{ label: "Dark", image: "dark.png" }] }

    const markup = viewMarkup(<QuestionBlock {...props({ question: visual })} />)

    expect(markup).toContain('src="dark.png"')
    expect(markup).toContain('alt="Dark"')
  })

  it("can show a mockup option in a sandboxed frame", () => {
    const visual: Question = { ...plain, options: [{ label: "Card", html: "<p>Card</p>" }] }

    const markup = viewMarkup(<QuestionBlock {...props({ question: visual })} />)

    expect(markup).toContain('sandbox="allow-scripts"')
  })

  it("can mark the picked option as checked", () => {
    const markup = viewMarkup(<QuestionBlock {...props({ selected: ["React"] })} />)

    expect(markup).toContain('aria-checked="true"')
  })

  it("can show a recommended badge on an option", () => {
    const recommended: Question = { ...plain, options: [{ label: "React", recommended: true }] }

    const markup = viewMarkup(<QuestionBlock {...props({ question: recommended })} />)

    expect(markup).toContain("Recommended")
  })

  it("can show the reply row with its typed text", () => {
    const markup = viewMarkup(<QuestionBlock {...props({ other: "Svelte" })} />)

    expect(markup).toContain('value="Svelte"')
  })

  it("can use the optional placeholder on a multi-select question", () => {
    const multi: Question = { ...plain, multiSelect: true }

    const markup = viewMarkup(<QuestionBlock {...props({ question: multi })} />)

    expect(markup).toContain("Type your own answer (optional)")
  })
})
