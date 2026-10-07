import { reaction } from "mobx"
import type { LibraryState } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { isDraftBecomingChat, libraryContext, samePlace, type LibraryContext, type Place } from "@/features/library/library-utils"
import type { NavHistoryStore } from "@/features/library/nav-history/nav-history-store/nav-history-store"
import type { LibraryStore } from "@/mirror/library-store"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"

// Walks the places visited in this window with Cmd+[ and Cmd+]. A place the main process can no longer
// open is dropped and the walk goes on. Recording follows the library: a draft that turns into a chat
// replaces its own entry rather than adding one.
export class NavHistoryPresenter {
  private started = false
  private disposers: (() => void)[] = []
  private previous: LibraryContext = { projectId: null, chatId: null, chatIds: new Set() }

  constructor(
    private readonly store: NavHistoryStore,
    private readonly library: Pick<LibraryService, "openChat" | "openProject">,
    private readonly chat: Pick<ChatService, "newChat">,
    private readonly mirror: LibraryStore,
    private readonly composer: Pick<ComposerPort, "focus">,
    private readonly commands: CommandRegistry,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers.push(reaction(() => this.mirror.library, this.handleLibraryChange))
    this.disposers.push(
      this.commands.register({
        id: "history.back",
        label: "Go back",
        group: "Actions",
        shortcut: { key: "[", mod: true },
        // The old palette never listed history steps.
        inPalette: false,
        run: () => {
          void this.back()
        },
      }),
    )
    this.disposers.push(
      this.commands.register({
        id: "history.forward",
        label: "Go forward",
        group: "Actions",
        shortcut: { key: "]", mod: true },
        inPalette: false,
        run: () => {
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

  // Steps toward an older or newer place. Places that are already on screen only move the index.
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
      } catch {
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
      await this.library.openChat(place.chatId, place.projectId ?? undefined)
      return
    }
    if (place.projectId !== null && place.projectId !== this.mirror.openProjectId) {
      await this.library.openProject(place.projectId)
    }
    await this.chat.newChat()
  }

  private here = (): Place => ({ projectId: this.mirror.openProjectId, chatId: this.mirror.openChatId })

  private focusComposer = () => {
    this.env.window.requestAnimationFrame(() => {
      this.composer.focus()
    })
  }
}
