import { compareStructural, reaction } from "mobx"
import type { FileService } from "@/ipc/file-service/file-service"
import type { FileViewerStore } from "@/features/changes/file-viewer-store/file-viewer-store"
import type { AppEnv } from "@/state/app-deps"
import type { PanelStore } from "@/state/panel-store"

// The view re-centres the target line this many times, this far apart, while Pierre fills the file in.
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

// The file viewer: opens the file in the editor, follows the target line when the file opens, and
// tells the view when Pierre's highlighter is ready.
export class FileViewerPresenter {
  private started = false
  private disposers: Array<() => void> = []
  private scroller: HTMLElement | null = null
  private stopFollowing: (() => void) | null = null

  constructor(
    private readonly store: FileViewerStore,
    private readonly panel: Pick<PanelStore, "viewedFile">,
    private readonly files: Pick<FileService, "openInEditor">,
    private readonly env: AppEnv,
    private readonly loadHighlighter: () => Promise<boolean>,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    // Opening the same file again keeps the scroll, as it did when the view compared its inputs.
    this.disposers = [reaction(() => this.followKey(), this.restartFollowing, { equals: compareStructural })]
    void this.loadHighlighter().then((ready) => {
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

  // The view's scroller, bound as a callback ref. Attaching starts the file's scroll; detaching stops it.
  attachScroller = (element: HTMLDivElement | null) => {
    this.scroller = element
    this.restartFollowing()
  }

  handleOpenInEditor = () => {
    const file = this.panel.viewedFile
    if (file === null) {
      return
    }
    const path = file.line ? `${file.absolutePath}:${file.line}` : file.absolutePath
    void this.files.openInEditor(path).catch(() => undefined)
  }

  // The fields that decide where a file view starts.
  private followKey = () => {
    const file = this.panel.viewedFile
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
    const line = this.panel.viewedFile?.line
    if (!line) {
      return
    }
    this.follow(scroller, line)
  }

  // Keeps the target line centred until the time runs out or the user scrolls, clicks or types.
  private follow = (scroller: HTMLElement, line: number) => {
    const win = this.env.window
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
