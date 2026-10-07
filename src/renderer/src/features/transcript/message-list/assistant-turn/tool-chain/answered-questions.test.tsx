import { describe, expect, it } from "vitest"
import type { AnsweredQuestion } from "@shared/types"
import { AnsweredQuestions } from "@/features/transcript/message-list/assistant-turn/tool-chain/answered-questions"
import { viewMarkup } from "@/test/view-markup"

describe("AnsweredQuestions", () => {
  it("shows what was picked, the other answer and the note", () => {
    const answers: AnsweredQuestion[] = [
      { question: "Which database?", selected: ["Postgres"], other: "SQLite too", note: "for tests", skipped: false },
    ]

    const markup = viewMarkup(<AnsweredQuestions answers={answers} />)

    expect(markup).toContain("Which database?")
    expect(markup).toContain("Postgres, SQLite too")
    expect(markup).toContain("Note: for tests")
  })

  it("shows a question the user left to the agent", () => {
    const answers: AnsweredQuestion[] = [{ question: "Which color?", selected: [], skipped: true }]

    const markup = viewMarkup(<AnsweredQuestions answers={answers} />)

    expect(markup).toContain("Left to the agent")
  })
})
