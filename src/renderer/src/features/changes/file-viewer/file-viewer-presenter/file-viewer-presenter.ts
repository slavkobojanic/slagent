import { compareStructural } from "mobx"
import type { FileViewerStore } from "@/features/changes/file-viewer/file-viewer-store/file-viewer-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"

// The target line is re-centred this many times, this far apart, while Pierre fills the file in.
const FOLLOW_TICKS = 30
const FOLLOW_MS = 50

// Pierre draws the file inside a shadow root, so the target gutter is found there, and the scroller
// is moved by hand to centre it. scrollIntoView does not cross the shadow boundary.
function scrollToLine(scroller: HTMLElement, line: number): void {
  const gutter = scroller.querySelector("diffs-container")?.shadowRoot?.querySelector(`[data-column-number="${line}"]`)
  if (!gutter) {
    return
  }
  const box = gutter.getBoundingClientRect()
  const top = box.top - scroller.getBoundingClientRect().top + scroller.scrollTop
  scroller.scrollTop = top - scroller.clientHeight / 2 + box.height / 2
}

export class FileViewerPresenter {
  private started = false
  private disposers: Array<() => void> = []
  private scroller: HTMLElement | null = null
  private stopFollowing: (() => void) | null = null

  constructor(
    private readonly store: FileViewerStore,
    private readonly panelStore: PanelStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly loadHighlighter: () => Promise<boolean>,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    // Opening the same file again keeps the scroll, as it did when the view compared its inputs.
    this.disposers = [this.log.reaction("follow-key", () => this.followKey(), this.restartFollowing, { equals: compareStructural })]
    // The file's contents arrive with the panel's viewed file. The viewer's own load is Pierre's highlighter.
    void this.log.span("load-highlighter", this.loadHighlighter).then((ready) => {
      if (!ready) {
        return
      }
      this.store.setHighlighterReady(true)
    })
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.endFollowing()
    this.started = false
  }

  // Bound as a callback ref: attaching starts following the line, detaching stops it.
  attachScroller = (element: HTMLDivElement | null) => {
    this.scroller = element
    this.restartFollowing()
  }

  handleOpenInEditor = () => {
    const file = this.panelStore.viewedFile
    if (file === null) {
      return
    }
    this.log.action("open-in-editor", { path: file.absolutePath, line: file.line })
    const path = file.line ? `${file.absolutePath}:${file.line}` : file.absolutePath
    void this.api.openInEditor(path).catch((error: unknown) => {
      this.log.warn("open-in-editor-failed", { path, error })
    })
  }

  private followKey = () => {
    const file = this.panelStore.viewedFile
    if (file === null) {
      return null
    }
    return { absolutePath: file.absolutePath, line: file.line, contents: file.contents }
  }

  private restartFollowing = () => {
    this.endFollowing()
    const scroller = this.scroller
    if (scroller === null) {
      return
    }
    scroller.scrollTop = 0
    const line = this.panelStore.viewedFile?.line
    if (!line) {
      return
    }
    this.follow(scroller, line)
  }

  // Stops early once the user scrolls, clicks or types.
  private follow = (scroller: HTMLElement, line: number) => {
    const win = this.window
    let ticks = 0
    let interrupted = false
    const interrupt = () => {
      interrupted = true
    }
    scroller.addEventListener("wheel", interrupt, { passive: true })
    scroller.addEventListener("pointerdown", interrupt)
    scroller.addEventListener("keydown", interrupt)
    const timer = win.setInterval(() => {
      ticks += 1
      if (!interrupted) {
        scrollToLine(scroller, line)
      }
      if (interrupted || ticks >= FOLLOW_TICKS) {
        win.clearInterval(timer)
      }
    }, FOLLOW_MS)
    this.stopFollowing = () => {
      win.clearInterval(timer)
      scroller.removeEventListener("wheel", interrupt)
      scroller.removeEventListener("pointerdown", interrupt)
      scroller.removeEventListener("keydown", interrupt)
    }
  }

  private endFollowing = () => {
    this.stopFollowing?.()
    this.stopFollowing = null
  }
}
