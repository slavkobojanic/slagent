import type { LibraryState } from "@shared/types"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import { isDraftBecomingChat, libraryContext, samePlace, type LibraryContext, type Place } from "@/features/library/library-utils"
import type { NavHistoryStore } from "@/features/library/nav-history/nav-history-store/nav-history-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"

// Walks the places visited in this window with Cmd+[ and Cmd+]. A place the main process can no longer
// open is dropped and the walk goes on. Recording follows the library: a draft that turns into a chat
// replaces its own entry rather than adding one.
export class NavHistoryPresenter {
  private started = false
  private disposers: (() => void)[] = []
  private previous: LibraryContext = { projectId: null, chatId: null, chatIds: new Set() }

  constructor(
    private readonly store: NavHistoryStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly libraryStore: LibraryStore,
    private readonly composerPort: ComposerPort,
    private readonly commandRegistry: CommandRegistry,
    private readonly chatSwitchPresenter: ChatSwitchPresenter,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers.push(this.log.reaction("library", () => this.libraryStore.library, this.handleLibraryChange))
    this.disposers.push(
      this.commandRegistry.register({
        id: "history.back",
        label: "Go back",
        group: "Actions",
        shortcut: { key: "[", mod: true },
        inPalette: false,
        run: () => {
          this.log.action("back", { index: this.store.index, entries: this.store.entries.length })
          void this.back()
        },
      }),
    )
    this.disposers.push(
      this.commandRegistry.register({
        id: "history.forward",
        label: "Go forward",
        group: "Actions",
        shortcut: { key: "]", mod: true },
        inPalette: false,
        run: () => {
          this.log.action("forward", { index: this.store.index, entries: this.store.entries.length })
          void this.forward()
        },
      }),
    )
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  handleLibraryChange = (library: LibraryState) => {
    const previous = this.previous
    const next = libraryContext(library)
    this.previous = next
    if (next.projectId === null) {
      return
    }
    if (samePlace(next, previous)) {
      return
    }
    const place: Place = { projectId: next.projectId, chatId: next.chatId }
    if (this.store.pending !== null) {
      if (samePlace(this.store.pending, place)) {
        this.store.setPending(null)
      }
      return
    }
    const current = this.store.current
    if (isDraftBecomingChat(previous, place) && current !== null && samePlace(current, previous)) {
      this.store.replaceCurrent(place)
      return
    }
    this.store.record(place)
  }

  back = () => this.navigate(-1)

  forward = () => this.navigate(1)

  // Places that are already on screen only move the index.
  private navigate = async (direction: -1 | 1) => {
    let index = this.store.index + direction
    while (index >= 0 && index < this.store.entries.length) {
      const place = this.store.entries[index]
      if (samePlace(place, this.here())) {
        this.store.moveTo(index)
        index += direction
        continue
      }
      this.store.setPending(place)
      try {
        await this.open(place)
        this.store.moveTo(index)
        this.focusComposer()
        return
      } catch (error) {
        this.log.warn("open-place-failed", { place, error })
        this.store.setPending(null)
        this.store.removeAt(index)
        if (direction === -1) {
          index -= 1
        }
      }
    }
  }

  private open = async (place: Place) => {
    if (place.chatId !== null) {
      await this.chatSwitchPresenter.openChat(place.chatId, place.projectId ?? undefined)
      return
    }
    if (place.projectId !== null && place.projectId !== this.libraryStore.openProjectId) {
      await this.api.openProject(place.projectId)
    }
    await this.api.newChat()
  }

  private here = (): Place => ({ projectId: this.libraryStore.openProjectId, chatId: this.libraryStore.openChatId })

  private focusComposer = () => {
    this.window.requestAnimationFrame(() => {
      this.composerPort.focus()
    })
  }
}
