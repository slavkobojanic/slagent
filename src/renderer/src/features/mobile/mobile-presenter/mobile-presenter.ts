import type { API } from "@/ipc/api"
import type { Device } from "@/ipc/device"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import { setKeyboardHeight } from "@/features/mobile/keyboard-height"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"

export class MobilePresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: MobileStore,
    private readonly libraryStore: LibraryStore,
    private readonly themeStore: ThemeStore,
    private readonly api: API,
    private readonly device: Device,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(this.api.onReconnect(this.restore))
    this.disposers.push(this.log.reaction("dark-chrome", () => this.themeStore.resolved === "dark", this.device.setDarkChrome, { fireImmediately: true }))
    this.disposers.push(this.device.onKeyboardShow((height) => setKeyboardHeight(this.window, height)))
    this.disposers.push(this.device.onKeyboardHide(() => setKeyboardHeight(this.window, 0)))
    this.device.hideKeyboardBar()
  }

  stop = () => {
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  openChat = async (projectId: string, chatId: string) => {
    if (this.store.opening !== null) {
      return
    }
    this.log.action("open-chat", { projectId, chatId })
    this.store.setOpening(chatId)
    try {
      // The library and transcript events arrive before the reply, so the chat is ready when it shows.
      await this.api.openChat(chatId, projectId)
      this.store.setScreen("chat")
    } catch (error) {
      this.log.warn("open-chat-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setOpening(null)
    }
  }

  // A null project starts a chat without a folder, like "No project" on the desktop.
  newChat = async (projectId: string | null) => {
    this.log.action("new-chat", { projectId })
    try {
      if (projectId === null) {
        await this.api.createChatProject()
      } else {
        await this.api.newChat(projectId)
      }
      this.store.setScreen("chat")
    } catch (error) {
      this.log.warn("new-chat-failed", { error })
      this.store.setError(errorText(error))
    }
  }

  back = () => {
    this.log.action("back")
    // The changes screen pops to the chat; the chat pops to the list.
    this.store.setScreen(this.store.screen === "changes" ? "chat" : "chats")
  }

  openConnection = () => {
    this.log.action("open-connection")
    this.store.connectionOpen = true
  }

  handleConnectionOpenChange = (open: boolean) => {
    this.store.connectionOpen = open
  }

  dismissError = () => {
    this.store.setError(null)
  }

  // The server starts a reconnected client on its last project with no chat, so a phone that
  // slept mid-chat asks for its chat back. The mirror has not re-fetched yet, so the library
  // still holds where the phone was.
  private restore = () => {
    if (this.store.screen !== "chat") {
      return
    }
    const { openProjectId, openChatId } = this.libraryStore.library
    if (openProjectId === null) {
      return
    }
    this.log.info("restore", { projectId: openProjectId, chatId: openChatId })
    const reopen = openChatId === null ? this.api.newChat(openProjectId) : this.api.openChat(openChatId, openProjectId)
    void reopen.catch((error) => this.log.warn("restore-failed", { error }))
  }
}
