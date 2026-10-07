import type { ComponentType } from "react"
import type { Question } from "@shared/types"

export type QuestionBlockProps = {
  question: Question
  attachQuestion: (element: HTMLElement | null) => void
  Media: ComponentType<{ question: Question }>
  Options: ComponentType<{ question: Question }>
  Other: ComponentType<{ question: Question }>
}

// The block takes focus when it mounts, so number keys answer the question right away.
export function QuestionBlock({ question, attachQuestion, Media, Options, Other }: QuestionBlockProps) {
  return (
    <div ref={attachQuestion} className="space-y-2 outline-none" tabIndex={-1} data-question>
      <Media question={question} />
      <Options question={question} />
      <Other question={question} />
    </div>
  )
}
