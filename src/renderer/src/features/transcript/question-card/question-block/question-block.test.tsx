import { describe, expect, it } from "vitest"
import type { Question } from "@shared/types"
import { QuestionBlock, type QuestionBlockProps } from "@/features/transcript/question-card/question-block/question-block"
import { viewMarkup } from "@/test/view-markup"

const plain: Question = {
  id: "q1",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

function part(name: string) {
  return function Part({ question }: { question: Question }) {
    return (
      <p>
        {name} {question.id}
      </p>
    )
  }
}

function props(overrides: Partial<QuestionBlockProps> = {}): QuestionBlockProps {
  return { question: plain, attachQuestion: () => {}, Media: part("Media"), Options: part("Options"), Other: part("Other"), ...overrides }
}

describe("QuestionBlock", () => {
  it("can show the media, the options and the reply row for its question, in order", () => {
    const markup = viewMarkup(<QuestionBlock {...props()} />)

    expect(markup).toContain("data-question")
    expect(markup.indexOf("Media q1")).toBeLessThan(markup.indexOf("Options q1"))
    expect(markup.indexOf("Options q1")).toBeLessThan(markup.indexOf("Other q1"))
  })
})
