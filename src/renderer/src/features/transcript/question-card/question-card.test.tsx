import { describe, expect, it } from "vitest"
import type { Question } from "@shared/types"
import { QuestionCard, type QuestionCardProps } from "@/features/transcript/question-card/question-card"
import { viewMarkup } from "@/test/view-markup"

const question: Question = {
  id: "q1",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

function Header() {
  return <p>Header</p>
}

function Block({ question }: { question: Question }) {
  return <p>Block {question.question}</p>
}

function Footer() {
  return <p>Footer</p>
}

function props(overrides: Partial<QuestionCardProps> = {}): QuestionCardProps {
  return { question, direction: 1, open: true, error: null, onKey: () => false, Header, Block, Footer, ...overrides }
}

describe("QuestionCard", () => {
  it("can show the header, the question block and the footer", () => {
    const markup = viewMarkup(<QuestionCard {...props()} />)

    expect(markup).toContain('aria-label="Question"')
    expect(markup.indexOf("Header")).toBeLessThan(markup.indexOf("Block Which library?"))
    expect(markup.indexOf("Block Which library?")).toBeLessThan(markup.indexOf("Footer"))
  })

  it("can show the error when a reply failed", () => {
    const markup = viewMarkup(<QuestionCard {...props({ error: "Network down" })} />)

    expect(markup).toContain('role="alert"')
    expect(markup).toContain("Network down")
  })
})
