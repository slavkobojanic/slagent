import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import { SEARCH_INPUT_ID, type ChatSearchPresenter } from "@/features/library/sidebar/chat-search/chat-search-presenter/chat-search-presenter"
import type { ChatSearchStore } from "@/features/library/sidebar/chat-search/chat-search-store/chat-search-store"
import { SearchBox } from "./search-box"

export function createSearchBox({
  chatSearchStore,
  chatSearchPresenter,
}: {
  chatSearchStore: ChatSearchStore
  chatSearchPresenter: ChatSearchPresenter
}): ComponentType {
  return observer(function SearchBoxHost() {
    return (
      <SearchBox
        inputId={SEARCH_INPUT_ID}
        query={chatSearchStore.query}
        onQueryChange={chatSearchPresenter.handleQueryChange}
        onKeyDown={chatSearchPresenter.handleKeyDown}
        onClear={chatSearchPresenter.handleClear}
      />
    )
  })
}
