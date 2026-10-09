import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"

// Loads the chat's changes, and keeps the file count on the chat header live by
// refreshing the status on the same git events the desktop diff panel follows.
export class MobileChangesPresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: MobileChangesStore,
    private readonly mobileStore: MobileStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers = [
      // Opening the screen loads it; a git event mid-run refreshes the open screen.
      this.log.reaction(
        "screen",
        () => this.mobileStore.screen,
        (screen, was) => {
          if (screen === "changes") {
            void this.handleRefresh()
            return
          }
          if (was === "changes") {
            return
          }
          // Coming to a chat refreshes its badge count only.
          void this.refreshStatus()
        },
      ),
      // The main process publishes git events while the agent changes files, so
      // the open screen follows the edits live and the badge stays current.
      this.api.onEvent((event) => {
        if (event.type !== "git") {
          return
        }
        if (this.mobileStore.screen === "changes") {
          void this.handleRefresh()
          return
        }
        void this.refreshStatus()
      }),
      // A finished run settles the working tree, so both the badge and an open screen catch up.
      this.log.reaction(
        "streaming",
        () => this.runStore.streaming,
        (streaming, wasStreaming) => {
          if (wasStreaming && !streaming && this.mobileStore.screen !== "chats") {
            void this.handleRefresh()
          }
        },
      ),
      // A reconnect may have missed events, so the state is re-read.
      this.api.onReconnect(() => {
        void this.handleRefresh()
      }),
    ]
  }

  stop = () => {
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  get projectName(): string | null {
    return this.mobileStore.projectName
  }

  // The chat header's changes button; its badge comes from the store's status.
  open = () => {
    this.log.action("open-changes")
    this.mobileStore.setScreen("changes")
  }

  // The screen's own back button, and the edge swipe, pop to the chat.
  back = () => {
    this.log.action("close-changes")
    this.mobileStore.setScreen("chat")
  }

  handleRefresh = async () => {
    this.store.setLoading(true)
    try {
      const [status, diff] = await Promise.all([this.api.gitStatus(), this.api.gitDiff("uncommitted")])
      this.store.setStatus(status)
      this.store.setFiles(diff)
    } catch (error) {
      // Not a git repository, or no folder open: the screen explains, the badge stays.
      this.log.warn("changes-refresh-failed", { error })
    } finally {
      this.store.setLoading(false)
    }
  }

  private refreshStatus = async () => {
    try {
      this.store.setStatus(await this.api.gitStatus())
    } catch (error) {
      this.log.debug("changes-status-failed", { error })
    }
  }
}
