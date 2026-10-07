import { makeAutoObservable, observableRef } from "mobx"
import type { LibraryState } from "@shared/types"

// The projects and chats the main process reports, and which ones are open.
// Only the mirror presenter writes it.
export class LibraryStore {
  library: LibraryState = { projects: [], openProjectId: null, chats: [], openChatId: null }

  constructor() {
    makeAutoObservable(this, { library: observableRef })
  }

  get openProjectId(): string | null {
    return this.library.openProjectId
  }

  get openChatId(): string | null {
    return this.library.openChatId
  }

  setLibrary(library: LibraryState) {
    this.library = library
  }
}
