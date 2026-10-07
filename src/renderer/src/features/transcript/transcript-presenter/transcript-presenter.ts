import { reaction } from "mobx"
import { toast } from "sonner"
import type { TranscriptPage } from "@shared/types"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import { errorText } from "@/lib/format"
import { findMessage, nextPage, visibleMessage } from "@/features/transcript/transcript-scroll"
import type { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import type { JumpPort } from "@/state/jump-port/jump-port"

// The parts of the use-stick-to-bottom context the presenter reads and drives.
export type ScrollControls = {
  isAtBottom: boolean
  scrollRef: { current: HTMLElement | null }
  scrollToBottom: (options?: { animation?: "instant" }) => unknown
  stopScroll: () => void
}

// The message the reader was on, and its offset from the top of the scroller.
type Anchor = { id: string; top: number }

type Jump = { id: string; frame: number }

export class TranscriptPresenter {
  private stick: ScrollControls | null = null
  private scroller: HTMLElement | null = null
  private loading = false
  private toLatest = false
  private anchor: Anchor | null = null
  private jumping: Jump | null = null
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: TranscriptStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly jumpPort: JumpPort,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(
      reaction(() => this.runStore.transcriptChatId, this.handleChatChanged),
      reaction(() => this.store.jumpTo, this.followJump),
      this.jumpPort.attach(this.jumpTo),
    )
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.detachScroller()
    this.cancelJump()
    this.stick = null
  }

  // Receives the stick context from the conversation on every commit, and null when it unmounts.
  attachScroll = (stick: ScrollControls | null) => {
    this.stick = stick
    if (stick === null) {
      return
    }
    this.store.setAtBottom(stick.isAtBottom)
    this.attachScroller(stick.scrollRef.current)
  }

  handleSettle = () => {
    this.attachScroller(this.stick?.scrollRef.current ?? null)
    this.followWindow()
    this.followJump()
  }

  // Goes to the bottom, or loads the latest turns when the window is not at the live end.
  handleScrollDown = () => {
    if (!this.runStore.transcriptPage.hasNewer) {
      void this.stick?.scrollToBottom()
      return
    }
    this.toLatest = true
    this.request("latest")
  }

  // The scroll happens once the message is rendered, so the request may arrive before its chat has loaded.
  jumpTo = (messageId: string) => {
    this.store.setJumpTo(messageId)
  }

  private handleChatChanged = () => {
    this.toLatest = false
    this.anchor = null
    this.cancelJump()
  }

  private attachScroller = (element: HTMLElement | null) => {
    if (element === this.scroller) {
      return
    }
    this.detachScroller()
    if (element === null) {
      return
    }
    this.scroller = element
    element.addEventListener("scroll", this.check, { passive: true })
    // Wheel too, so a window too short to scroll can still page.
    element.addEventListener("wheel", this.check, { passive: true })
  }

  private detachScroller = () => {
    this.scroller?.removeEventListener("scroll", this.check)
    this.scroller?.removeEventListener("wheel", this.check)
    this.scroller = null
  }

  private check = () => {
    const scroller = this.scroller
    if (scroller === null || this.loading) {
      return
    }
    const fromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    const next = nextPage(this.runStore.transcriptPage, scroller.scrollTop, fromBottom)
    if (next === null) {
      return
    }
    // Keeps stick-to-bottom from chasing turns appended below the reader.
    if (next === "newer") {
      this.stick?.stopScroll()
    }
    this.anchor = visibleMessage(scroller)
    this.request(next)
  }

  private request = (next: TranscriptPage) => {
    this.loading = true
    this.api
      .pageTranscript(next)
      // The new window renders before the next frame; the anchor is released after it.
      .then(() => new Promise<void>((resolve) => this.window.requestAnimationFrame(() => resolve())))
      .catch((error: unknown) => {
        toast.error(errorText(error))
      })
      .finally(() => {
        this.loading = false
        this.anchor = null
        this.check()
      })
  }

  // Once the reader has asked for the latest turns and they are in, returns to the bottom instead.
  private followWindow = () => {
    if (this.toLatest && !this.runStore.transcriptPage.hasNewer) {
      this.toLatest = false
      this.anchor = null
      void this.stick?.scrollToBottom({ animation: "instant" })
      return
    }
    const held = this.anchor
    const scroller = this.scroller
    if (held === null || scroller === null) {
      return
    }
    const element = findMessage(scroller, held.id)
    if (element === null) {
      return
    }
    scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - held.top
  }

  private followJump = () => {
    const id = this.store.jumpTo
    if (id === null || !this.runStore.messages.some((message) => message.id === id)) {
      this.cancelJump()
      return
    }
    if (this.jumping?.id === id) {
      return
    }
    this.cancelJump()
    const frame = this.window.requestAnimationFrame(() => this.finishJump(id))
    this.jumping = { id, frame }
  }

  // Releases the stick-to-bottom lock so the chat does not snap back down, and flashes the message.
  private finishJump = (id: string) => {
    this.jumping = null
    this.store.setJumpTo(null)
    const element = findMessage(this.window.document, id)
    if (element === null) {
      return
    }
    this.stick?.stopScroll()
    element.scrollIntoView({ block: "center" })
    element.classList.remove("search-hit")
    // Forces a reflow so the flash animation restarts.
    void element.offsetWidth
    element.classList.add("search-hit")
  }

  private cancelJump = () => {
    if (this.jumping === null) {
      return
    }
    this.window.cancelAnimationFrame(this.jumping.frame)
    this.jumping = null
  }
}
