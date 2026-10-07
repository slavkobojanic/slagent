import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Question } from "@shared/types"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { QuestionOptions } from "./question-options"
import { hasVisualOptions } from "./visual-options"

export function createQuestionOptions({
  questionCardStore,
  questionCardPresenter,
  HtmlFrame,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
  HtmlFrame: ComponentType<{ html: string; title: string; frameKey: string }>
}): ComponentType<{ question: Question }> {
  return observer(function QuestionOptionsHost({ question }: { question: Question }) {
    return (
      <QuestionOptions
        question={question}
        selected={questionCardStore.draftOf(question.id).selected}
        visual={hasVisualOptions(question)}
        HtmlFrame={HtmlFrame}
        onPick={questionCardPresenter.handlePick}
      />
    )
  })
}
