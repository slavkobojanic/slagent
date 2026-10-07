import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSearchPresenter } from "@/features/library/sidebar/chat-search/chat-search-presenter/chat-search-presenter"
import type { ChatSearchStore } from "@/features/library/sidebar/chat-search/chat-search-store/chat-search-store"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { SearchResults } from "./search-results"

export function createSearchResults({
  libraryStore,
  chatSearchStore,
  chatSearchPresenter,
}: {
  libraryStore: LibraryStore
  chatSearchStore: ChatSearchStore
  chatSearchPresenter: ChatSearchPresenter
}): ComponentType {
  return observer(function SearchResultsHost() {
    return <SearchResults results={chatSearchStore.results ?? []} openChatId={libraryStore.openChatId} onOpen={chatSearchPresenter.handleOpen} />
  })
}
