import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Question } from "@shared/types"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { OtherRow } from "./other-row"

export function createOtherRow({
  questionCardStore,
  questionCardPresenter,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
}): ComponentType<{ question: Question }> {
  return observer(function OtherRowHost({ question }: { question: Question }) {
    return (
      <OtherRow
        multiSelect={question.multiSelect}
        optionCount={question.options.length}
        other={questionCardStore.draftOf(question.id).other}
        onChange={questionCardPresenter.handleOtherChange}
      />
    )
  })
}
