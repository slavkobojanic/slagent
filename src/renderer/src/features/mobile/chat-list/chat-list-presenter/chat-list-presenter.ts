import type { Log } from "@/log/log"
import type { MobileChatListStore } from "@/features/mobile/chat-list/chat-list-store/chat-list-store"

// A finished chat shows as done for a few minutes, so the list re-reads the clock now and then.
const TICK_MS = 30_000

export class MobileChatListPresenter {
  private timer: ReturnType<Window["setInterval"]> | null = null

  constructor(
    private readonly store: MobileChatListStore,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.timer !== null) {
      return
    }
    this.log.debug("start")
    this.timer = this.window.setInterval(() => this.store.setNow(Date.now()), TICK_MS)
  }

  stop = () => {
    if (this.timer === null) {
      return
    }
    this.window.clearInterval(this.timer)
    this.timer = null
  }
}
