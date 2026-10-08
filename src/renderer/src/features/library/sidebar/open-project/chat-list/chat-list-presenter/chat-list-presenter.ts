import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatListStore } from "@/features/library/sidebar/open-project/chat-list/chat-list-store/chat-list-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const NUMBERED_CHATS = 9

export class ChatListPresenter {
  private started = false
  private disposers: (() => void)[] = []
  private media: MediaQueryList | null = null

  constructor(
    private readonly store: ChatListStore,
    private readonly libraryStore: LibraryStore,
    private readonly window: Window,
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
    this.media = this.window.matchMedia(REDUCE_MOTION_QUERY)
    this.store.setReduceMotion(this.media.matches)
    this.media.addEventListener("change", this.handleMotionChange)
    this.disposers.push(
      this.log.reaction(
        "open-project-id",
        () => this.libraryStore.openProjectId,
        () => {
          this.store.setShowAll(false)
        },
      ),
    )
    // Only the open project's list owns the numbered shortcuts, because the palette hints at them.
    if (this.store.projectId !== undefined) {
      return
    }
    for (let position = 1; position <= NUMBERED_CHATS; position += 1) {
      this.disposers.push(
        this.commandRegistry.register({
          id: `chat.open.${position}`,
          label: `Open chat ${position}`,
          group: "Chats",
          shortcut: { key: String(position), mod: true },
          // The palette already lists chats with their number hints.
          inPalette: false,
          enabled: () => this.store.chatAt(position) !== undefined,
          run: () => {
            void this.openChatAt(position)
          },
        }),
      )
    }
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.media?.removeEventListener("change", this.handleMotionChange)
    this.media = null
    this.started = false
  }

  handleShowAll = () => {
    this.log.action("show-all-chats")
    this.store.setShowAll(true)
  }

  handleShowLess = () => {
    this.log.action("show-fewer-chats")
    this.store.setShowAll(false)
  }

  private openChatAt = async (position: number) => {
    const chat = this.store.chatAt(position)
    if (chat === undefined) {
      return
    }
    this.log.action("open-chat-at", { position, chatId: chat.id })
    await toastFailure(() => this.chatSwitchPresenter.openChat(chat.id))
    this.window.requestAnimationFrame(() => {
      this.composerPort.focus()
    })
  }

  private handleMotionChange = (event: MediaQueryListEvent) => {
    this.store.setReduceMotion(event.matches)
  }
}
