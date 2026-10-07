import { toast } from "sonner"
import type { ChatSearchResult, ChatSummary } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { orderedChats } from "@/features/library/library-utils"
import { errorText, formatTranscript } from "@/lib/format"
import type { LibraryStore } from "@/mirror/library-store"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"

// The library's actions: switching projects and chats, starting a chat, pin, rename, folder choice,
// search, and copying a transcript. The main process owns the library, so a failed call only shows a
// toast. It never changes the mirrored library. Also registers the library's keyboard commands.
export class LibraryPresenter {
  private started = false
  private disposers: (() => void)[] = []

  constructor(
    private readonly library: Pick<LibraryService, "openProject" | "openChat" | "pinProject" | "pinChat" | "renameChat" | "chooseFolder" | "searchChats">,
    private readonly chat: Pick<ChatService, "newChat" | "readTranscript">,
    private readonly state: LibraryStore,
    private readonly composer: Pick<ComposerPort, "focus">,
    private readonly commands: CommandRegistry,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers.push(
      this.commands.register({
        id: "chat.new",
        label: "New chat",
        group: "Actions",
        shortcut: { key: "n", mod: true },
        enabled: () => this.state.openProjectId !== null,
        run: () => {
          void this.newChat()
        },
      }),
    )
    this.disposers.push(
      this.commands.register({
        id: "folder.open",
        label: "Open folder",
        group: "Actions",
        run: () => {
          void this.chooseFolder()
        },
      }),
    )
    for (let position = 1; position <= 9; position += 1) {
      this.disposers.push(
        this.commands.register({
          id: `chat.open.${position}`,
          label: `Open chat ${position}`,
          group: "Chats",
          shortcut: { key: String(position), mod: true },
          // The palette already lists chats with their number hints, so these stay out of it.
          inPalette: false,
          enabled: () => this.chatAt(position) !== undefined,
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
    this.started = false
  }

  openProject = (projectId: string) => this.run(() => this.library.openProject(projectId))

  openChat = (chatId: string, projectId?: string, messageId?: string) => this.run(() => this.library.openChat(chatId, projectId, messageId))

  // Opens the chat and then gives the prompt box focus, as the number shortcuts do.
  openChatFocused = async (chatId: string) => {
    await this.openChat(chatId)
    this.focusComposer()
  }

  // Starts a draft. A different project opens first when one is given.
  newChat = async (projectId?: string) => {
    await this.run(async () => {
      if (projectId !== undefined && projectId !== this.state.openProjectId) {
        await this.library.openProject(projectId)
      }
      await this.chat.newChat()
    })
    this.focusComposer()
  }

  pinProject = (projectId: string, pinned: boolean) => this.run(() => this.library.pinProject(projectId, pinned))

  pinChat = (chatId: string, pinned: boolean) => this.run(() => this.library.pinChat(chatId, pinned))

  renameChat = (chatId: string, title: string) => this.run(() => this.library.renameChat(chatId, title))

  chooseFolder = () => this.run(() => this.library.chooseFolder())

  // Search failures are left to the caller, which keeps its current results.
  searchChats = (query: string): Promise<ChatSearchResult[]> => this.library.searchChats(query)

  copyTranscript = async (chat: ChatSummary) => {
    try {
      const stored = await this.chat.readTranscript(chat.id)
      const text = formatTranscript(chat.title, stored)
      if (text === "") {
        toast.error("This chat is empty.")
        return
      }
      await this.env.window.navigator.clipboard.writeText(text)
      toast.success("Transcript copied")
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  focusComposer = () => {
    this.env.window.requestAnimationFrame(() => {
      this.composer.focus()
    })
  }

  private chatAt = (position: number): ChatSummary | undefined => orderedChats(this.state.library.chats)[position - 1]

  private openChatAt = async (position: number) => {
    const chat = this.chatAt(position)
    if (chat === undefined) {
      return
    }
    await this.openChatFocused(chat.id)
  }

  // A failure is shown as a toast. The result says whether the call worked, so a caller can skip what needs it.
  private run = async (task: () => Promise<void>): Promise<boolean> => {
    try {
      await task()
      return true
    } catch (error) {
      toast.error(errorText(error))
      return false
    }
  }
}
