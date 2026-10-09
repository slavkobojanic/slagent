import { makeAutoObservable } from "mobx"
import { openChatOf } from "@/features/shell/shell-header/chat-title/chat-title-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MobileScreen } from "@/features/mobile/mobile-screen"


export class MobileStore {
  screen: MobileScreen = "chats"
  connectionOpen = false
  // The chat being opened, so its row can show that the tap landed.
  opening: string | null = null
  error: string | null = null

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  get chatTitle(): string {
    return openChatOf(this.libraryStore.library)?.title ?? "New chat"
  }

  get projectName(): string | null {
    const { projects, openProjectId } = this.libraryStore.library
    const project = projects.find((item) => item.id === openProjectId)
    if (project === undefined || (project.mode ?? "code") === "chat") {
      return null
    }
    return project.name
  }

  setScreen(screen: MobileScreen) {
    this.screen = screen
    this.error = null
  }

  setOpening(chatId: string | null) {
    this.opening = chatId
  }

  setError(message: string | null) {
    this.error = message
  }
}
