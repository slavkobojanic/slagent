import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createQuestionBlock } from "./question-block/create"
import { QuestionCard } from "./question-card"
import { QuestionCardPresenter } from "./question-card-presenter/question-card-presenter"
import { QuestionCardStore } from "./question-card-store/question-card-store"
import { createQuestionFooter } from "./question-footer/create"
import { createQuestionHeader } from "./question-header/create"

export function createQuestionCard({
  api,
  window,
  runStore,
  themeStore,
}: {
  api: API
  window: Window
  runStore: RunStore
  themeStore: ThemeStore
}): ComponentType {
  const store = new QuestionCardStore()
  const presenter = new QuestionCardPresenter(store, runStore, api, window)
  presenter.start()

  const Header = createQuestionHeader({ questionCardStore: store, questionCardPresenter: presenter })
  const Block = createQuestionBlock({ questionCardStore: store, questionCardPresenter: presenter, themeStore })
  const Footer = createQuestionFooter({ questionCardStore: store, questionCardPresenter: presenter })

  return observer(function QuestionCardHost() {
    const question = store.question
    if (question === null) {
      return null
    }
    // Keyed by the request, so a new request mounts a fresh card.
    return (
      <QuestionCard
        key={store.requestId}
        question={question}
        direction={store.direction}
        open={store.open}
        error={store.error}
        onKey={presenter.handleKey}
        Header={Header}
        Block={Block}
        Footer={Footer}
      />
    )
  })
}
