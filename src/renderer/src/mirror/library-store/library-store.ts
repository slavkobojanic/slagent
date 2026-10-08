import { makeAutoObservable } from "mobx"
import type { LibraryState } from "@shared/types"

export class LibraryStore {
  library: LibraryState = { projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null }

  constructor() {
    makeAutoObservable(this)
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
