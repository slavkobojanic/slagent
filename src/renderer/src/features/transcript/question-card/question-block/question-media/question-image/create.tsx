import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { QuestionImage } from "./question-image"

export function createQuestionImage({
  questionCardStore,
  questionCardPresenter,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
}): ComponentType<{ src: string; alt: string }> {
  return observer(function QuestionImageHost({ src, alt }: { src: string; alt: string }) {
    return (
      <QuestionImage
        src={src}
        alt={alt}
        broken={questionCardStore.isBroken(src)}
        zoomed={questionCardStore.zoomed}
        onError={questionCardPresenter.handleImageError}
        onZoomChange={questionCardPresenter.handleZoomChange}
      />
    )
  })
}
