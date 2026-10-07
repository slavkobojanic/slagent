import { when } from "mobx"
import type { LibraryState } from "@shared/types"
import { isDraftBecomingChat, libraryContext, samePlace, type LibraryContext } from "@/features/library/library-utils"
import type { API } from "@/ipc/api"
import type { Log, LogData } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"

type PendingSwitch = { end: (more?: LogData) => void; dispose: () => void }

// The side panel, the open file, and pending review comments belong to the chat they were made in.
// They reset when the user moves to another chat or project. A draft that becomes a chat on its first
// message keeps them, because the same conversation continues.
export class ChatSwitchPresenter {
  private disposer: (() => void) | null = null
  private previous: LibraryContext = { projectId: null, chatId: null, chatIds: new Set() }
  private pending: PendingSwitch | null = null

  constructor(
    private readonly libraryStore: LibraryStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly panelPresenter: PanelPresenter,
    private readonly reviewPresenter: ReviewPresenter,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = this.log.reaction("library", () => this.libraryStore.library, this.handleLibraryChange)
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
    this.pending?.dispose()
    this.pending = null
  }

  // Every chat switch goes through here so the "switch" timing covers each path that opens a chat.
  openChat = async (...args: Parameters<API["openChat"]>) => {
    const [chatId] = args
    this.timeSwitch(chatId)
    try {
      await this.api.openChat(...args)
    } catch (error) {
      this.finishSwitch({ chatId, failed: true })
      throw error
    }
  }

  handleLibraryChange = (library: LibraryState) => {
    const previous = this.previous
    const next = libraryContext(library)
    this.previous = next
    if (samePlace(next, previous)) {
      return
    }
    if (isDraftBecomingChat(previous, next)) {
      return
    }
    this.panelPresenter.reset()
    this.reviewPresenter.reset()
  }

  // The switch is done once the chat is open and its transcript has replaced the previous one.
  private timeSwitch = (chatId: string) => {
    this.finishSwitch({ superseded: true })
    const pending: PendingSwitch = { end: this.log.time("switch", { chatId }), dispose: () => undefined }
    this.pending = pending
    pending.dispose = when(
      () => this.libraryStore.openChatId === chatId && this.runStore.transcriptChatId === chatId,
      () => {
        if (this.pending === pending) {
          this.finishSwitch({ chatId })
        }
      },
    )
  }

  private finishSwitch = (more: LogData) => {
    const pending = this.pending
    if (pending === null) {
      return
    }
    this.pending = null
    pending.dispose()
    pending.end(more)
  }
}
