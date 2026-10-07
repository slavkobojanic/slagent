import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Question } from "@shared/types"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { createQuestionImage } from "./question-image/create"
import { QuestionMedia } from "./question-media"

export function createQuestionMedia({
  questionCardStore,
  questionCardPresenter,
  HtmlFrame,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
  HtmlFrame: ComponentType<{ html: string; title: string; frameKey: string }>
}): ComponentType<{ question: Question }> {
  const Image = createQuestionImage({ questionCardStore, questionCardPresenter })

  return observer(function QuestionMediaHost({ question }: { question: Question }) {
    return (
      <QuestionMedia
        image={question.image}
        html={question.html}
        preview={question.preview}
        title={question.question}
        frameKey={`${question.id}:media`}
        Image={Image}
        HtmlFrame={HtmlFrame}
      />
    )
  })
}
