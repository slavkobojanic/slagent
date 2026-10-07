import type { ComponentType } from "react"
import type { Question } from "@shared/types"
import type { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createHtmlFrame } from "./html-frame/create"
import { createOtherRow } from "./other-row/create"
import { QuestionBlock } from "./question-block"
import { createQuestionMedia } from "./question-media/create"
import { createQuestionOptions } from "./question-options/create"

// The block takes the question as a prop rather than reading the store, so a block sliding out
// keeps showing the question it was built for.
export function createQuestionBlock({
  questionCardStore,
  questionCardPresenter,
  themeStore,
}: {
  questionCardStore: QuestionCardStore
  questionCardPresenter: QuestionCardPresenter
  themeStore: ThemeStore
}): ComponentType<{ question: Question }> {
  const HtmlFrame = createHtmlFrame({ questionCardStore, themeStore })
  const Media = createQuestionMedia({ questionCardStore, questionCardPresenter, HtmlFrame })
  const Options = createQuestionOptions({ questionCardStore, questionCardPresenter, HtmlFrame })
  const Other = createOtherRow({ questionCardStore, questionCardPresenter })

  return function QuestionBlockHost({ question }: { question: Question }) {
    return <QuestionBlock question={question} attachQuestion={questionCardPresenter.attachQuestion} Media={Media} Options={Options} Other={Other} />
  }
}
