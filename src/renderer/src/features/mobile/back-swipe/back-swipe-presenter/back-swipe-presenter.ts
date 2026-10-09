import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { BackSwipeStore } from "@/features/mobile/back-swipe/back-swipe-store/back-swipe-store"
import type { Log } from "@/log/log"

// A touch starting within this distance of the left edge may become a back swipe.
export const EDGE_PX = 24
// Horizontal travel that claims the gesture away from a vertical scroll.
const CLAIM_PX = 8
// Travel that commits the pop, and the drag distance the indicator fills over.
const COMMIT_PX = 96

// The iOS-style swipe from the left edge that pops the chat back to the list.
// The webview is a single page with no back-forward entries, so WKWebView's own
// gesture has nothing to go back to; this tracks the touch directly and calls
// the same back the header button uses.
export class BackSwipePresenter {
  private disposers: Array<() => void> = []
  private origin: { x: number; y: number } | null = null
  private claimed = false

  constructor(
    private readonly store: BackSwipeStore,
    private readonly mobileStore: MobileStore,
    private readonly back: () => void,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    // touchmove is cancelable so a claimed swipe can stop the transcript's scroll.
    this.window.addEventListener("touchstart", this.handleStart, { passive: true })
    this.window.addEventListener("touchmove", this.handleMove, { passive: false })
    this.window.addEventListener("touchend", this.handleEnd)
    this.window.addEventListener("touchcancel", this.handleCancel)
    this.disposers.push(() => {
      this.window.removeEventListener("touchstart", this.handleStart)
      this.window.removeEventListener("touchmove", this.handleMove)
      this.window.removeEventListener("touchend", this.handleEnd)
      this.window.removeEventListener("touchcancel", this.handleCancel)
    })
  }

  stop = () => {
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  handleStart = (event: TouchEvent) => {
    this.origin = null
    this.claimed = false
    this.store.setProgress(0)
    if (event.touches.length !== 1) {
      return
    }
    const touch = event.touches[0]
    if (touch.clientX > EDGE_PX || this.mobileStore.screen !== "chat") {
      return
    }
    this.origin = { x: touch.clientX, y: touch.clientY }
  }

  handleMove = (event: TouchEvent) => {
    if (this.origin === null) {
      return
    }
    if (event.touches.length !== 1) {
      // A second finger (a pinch) abandons the swipe.
      this.origin = null
      this.claimed = false
      this.store.setProgress(0)
      return
    }
    const touch = event.touches[0]
    const dx = touch.clientX - this.origin.x
    const dy = touch.clientY - this.origin.y
    if (!this.claimed) {
      // A drag more vertical than horizontal belongs to the transcript's scroll.
      if (Math.abs(dy) >= Math.abs(dx) || dx < CLAIM_PX) {
        return
      }
      this.claimed = true
    }
    event.preventDefault()
    this.store.setProgress(Math.min(Math.max(dx, 0) / COMMIT_PX, 1))
  }

  handleEnd = () => {
    if (this.claimed && this.store.progress >= 1) {
      this.log.action("back-swipe")
      this.back()
    }
    this.reset()
  }

  // The system took the touch (a banner, a control-centre drag), so no pop.
  handleCancel = () => {
    this.reset()
  }

  private reset = () => {
    this.origin = null
    this.claimed = false
    this.store.setProgress(0)
  }
}
