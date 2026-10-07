import { observer } from "mobx-react-lite"
import { type ComponentType, useEffect } from "react"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import { SuggestionList } from "@/features/composer/suggestion-list/suggestion-list"
import type { SuggestionsPresenter } from "./suggestions-presenter/suggestions-presenter"
import type { SuggestionsStore } from "./suggestions-store/suggestions-store"

export function createSuggestions({
  suggestionsStore,
  suggestionsPresenter,
  composerPresenter,
}: {
  suggestionsStore: SuggestionsStore
  suggestionsPresenter: SuggestionsPresenter
  composerPresenter: ComposerPresenter
}): ComponentType {
  return observer(function SuggestionsHost() {
    useEffect(() => {
      suggestionsPresenter.start()
      return suggestionsPresenter.stop
    }, [])

    return (
      <SuggestionList
        menu={suggestionsStore.menu}
        active={suggestionsStore.active}
        onHover={suggestionsPresenter.hover}
        onChoose={composerPresenter.chooseSuggestion}
      />
    )
  })
}
