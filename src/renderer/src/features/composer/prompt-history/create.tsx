import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import { SuggestionList } from "@/features/composer/suggestion-list/suggestion-list"
import type { PromptHistoryPresenter } from "./prompt-history-presenter/prompt-history-presenter"
import type { PromptHistoryStore } from "./prompt-history-store/prompt-history-store"

export function createPromptHistory({
  promptHistoryStore,
  promptHistoryPresenter,
  composerPresenter,
}: {
  promptHistoryStore: PromptHistoryStore
  promptHistoryPresenter: PromptHistoryPresenter
  composerPresenter: ComposerPresenter
}): ComponentType {
  return observer(function PromptHistoryHost() {
    return (
      <SuggestionList
        menu={promptHistoryStore.menu}
        active={promptHistoryStore.active}
        onHover={promptHistoryPresenter.hover}
        onChoose={composerPresenter.chooseHistory}
      />
    )
  })
}
