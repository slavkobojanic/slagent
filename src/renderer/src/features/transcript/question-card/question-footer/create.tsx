import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { QuestionFooter } from "./question-footer"

export function createQuestionFooter({
  questionCardStore,
  questionCardPresenter,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
}): ComponentType {
  return observer(function QuestionFooterHost() {
    return (
      <QuestionFooter
        index={questionCardStore.index}
        count={questionCardStore.count}
        hasPrevious={questionCardStore.hasPrevious}
        hasNext={questionCardStore.hasNext}
        busy={questionCardStore.busy}
        stepReady={questionCardStore.stepReady}
        ready={questionCardStore.ready}
        onBack={questionCardPresenter.handleBack}
        onSkip={questionCardPresenter.handleSkip}
        onNext={questionCardPresenter.handleNext}
        onSend={questionCardPresenter.handleSend}
      />
    )
  })
}
