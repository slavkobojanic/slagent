import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { QuestionHeader } from "./question-header"

export function createQuestionHeader({
  questionCardStore,
  questionCardPresenter,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
}): ComponentType {
  return observer(function QuestionHeaderHost() {
    const question = questionCardStore.question
    if (question === null) {
      return null
    }
    return (
      <QuestionHeader
        index={questionCardStore.index}
        count={questionCardStore.count}
        header={question.header}
        question={question.question}
        open={questionCardStore.open}
        busy={questionCardStore.busy}
        onToggleOpen={questionCardPresenter.handleToggleOpen}
        onSkip={questionCardPresenter.handleSkip}
      />
    )
  })
}
