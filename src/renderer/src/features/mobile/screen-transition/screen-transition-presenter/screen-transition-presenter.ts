import type { Log } from "@/log/log"
import type { MobileScreen } from "@/features/mobile/mobile-screen"
import type { ScreenTransitionStore } from "@/features/mobile/screen-transition/screen-transition-store/screen-transition-store"

const PUSH_MS = 250
const POP_MS = 200

export class ScreenTransitionPresenter {
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly store: ScreenTransitionStore,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  handleScreenChange = (screen: MobileScreen) => {
    this.store.transitionTo(screen)
    if (this.store.leaving === null) return

    const ms = this.store.direction === "push" ? PUSH_MS : POP_MS
    if (this.timer !== null) {
      this.window.clearTimeout(this.timer)
    }
    this.timer = this.window.setTimeout(() => {
      this.store.finishTransition()
      this.timer = null
    }, ms)
  }

  stop = () => {
    if (this.timer !== null) {
      this.window.clearTimeout(this.timer)
      this.timer = null
    }
  }
}
