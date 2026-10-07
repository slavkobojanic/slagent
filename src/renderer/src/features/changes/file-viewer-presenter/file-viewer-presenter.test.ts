import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeFile } from "@/features/changes/changes-fixtures"
import { FileViewerPresenter } from "@/features/changes/file-viewer-presenter/file-viewer-presenter"
import { FileViewerStore } from "@/features/changes/file-viewer-store/file-viewer-store"
import type { FileService } from "@/ipc/file-service/file-service"
import { PanelStore } from "@/state/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"

// Pierre draws the file in a shadow root under a diffs-container element. The target gutter sits
// 300px down and is 20px tall, in a 400px scroller, so the centred scroll position is 110.
function makeScroller(): { scroller: HTMLDivElement; scrollTop: () => number } {
  const scroller = document.createElement("div")
  let top = 0
  Object.defineProperty(scroller, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value
    },
  })
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 400 })
  scroller.getBoundingClientRect = () => ({ top: 0, bottom: 400, height: 400, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => ({}) })
  const host = document.createElement("diffs-container")
  const root = host.attachShadow({ mode: "open" })
  const gutter = document.createElement("div")
  gutter.setAttribute("data-column-number", "5")
  gutter.getBoundingClientRect = () => ({ top: 300, bottom: 320, height: 20, left: 0, right: 0, width: 0, x: 0, y: 300, toJSON: () => ({}) })
  root.append(gutter)
  scroller.append(host)
  return { scroller, scrollTop: () => top }
}

function setup(loadHighlighter = vi.fn(async () => true)) {
  const panel = new PanelStore()
  const store = new FileViewerStore()
  const files = createMockInstance<FileService>(["openInEditor"])
  const presenter = new FileViewerPresenter(store, panel, files, { window }, loadHighlighter)
  return { panel, store, files, loadHighlighter, presenter }
}

describe("FileViewerPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    vi.useFakeTimers()
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
    vi.useRealTimers()
  })

  describe("start", () => {
    it("can mark the highlighter ready once it has loaded", async () => {
      const { store, presenter } = parts
      presenter.start()

      await vi.waitFor(() => expect(store.highlighterReady).toBe(true))
    })

    it("can leave the highlighter not ready when it fails to load", async () => {
      const { store, loadHighlighter, presenter } = parts
      loadHighlighter.mockResolvedValue(false)
      presenter.start()

      await Promise.resolve()
      await Promise.resolve()

      expect(store.highlighterReady).toBe(false)
    })
  })

  describe("attachScroller", () => {
    beforeEach(() => {
      parts.presenter.start()
    })

    it("can reset the scroll to the top for a file without a line", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      scroller.scrollTop = 80
      panel.setViewedFile(makeFile({ line: null }))

      presenter.attachScroller(scroller)

      expect(scrollTop()).toBe(0)
    })

    it("can centre the target line for a file that opens at a line", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: 5 }))

      presenter.attachScroller(scroller)
      vi.advanceTimersByTime(50)

      expect(scrollTop()).toBe(110)
    })

    it("can stop following the line once the user scrolls", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: 5 }))
      presenter.attachScroller(scroller)

      scroller.dispatchEvent(new Event("wheel"))
      scroller.scrollTop = 42
      vi.advanceTimersByTime(500)

      expect(scrollTop()).toBe(42)
    })

    it("can stop following the line after its thirty ticks", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: 5 }))
      presenter.attachScroller(scroller)

      vi.advanceTimersByTime(50 * 30)
      scroller.scrollTop = 7
      vi.advanceTimersByTime(500)

      expect(scrollTop()).toBe(7)
    })

    it("can start from the top again when a different file opens", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: null }))
      presenter.attachScroller(scroller)
      scroller.scrollTop = 90

      panel.setViewedFile(makeFile({ absolutePath: "/work/src/other.ts", path: "src/other.ts", line: null }))

      expect(scrollTop()).toBe(0)
    })

    it("can keep the scroll when the same file is set again", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: null }))
      presenter.attachScroller(scroller)
      scroller.scrollTop = 90

      panel.setViewedFile(makeFile({ line: null }))

      expect(scrollTop()).toBe(90)
    })

    it("can stop following the line when the view detaches", () => {
      const { panel, presenter } = parts
      const { scroller, scrollTop } = makeScroller()
      panel.setViewedFile(makeFile({ line: 5 }))
      presenter.attachScroller(scroller)

      presenter.attachScroller(null)
      vi.advanceTimersByTime(500)

      expect(scrollTop()).toBe(0)
    })
  })

  describe("handleOpenInEditor", () => {
    it("can open the file at its absolute path when it has no line", () => {
      const { panel, files, presenter } = parts
      files.openInEditor.mockResolvedValue(true)
      panel.setViewedFile(makeFile({ line: null }))

      presenter.handleOpenInEditor()

      expect(files.openInEditor).toHaveBeenCalledWith("/work/src/app.ts")
    })

    it("can open the file at its line as a :line suffix", () => {
      const { panel, files, presenter } = parts
      files.openInEditor.mockResolvedValue(true)
      panel.setViewedFile(makeFile({ line: 12 }))

      presenter.handleOpenInEditor()

      expect(files.openInEditor).toHaveBeenCalledWith("/work/src/app.ts:12")
    })

    it("can do nothing when no file is open", () => {
      const { files, presenter } = parts

      presenter.handleOpenInEditor()

      expect(files.openInEditor).not.toHaveBeenCalled()
    })

    it("can ignore an editor that fails to open the file", async () => {
      const { panel, files, presenter } = parts
      files.openInEditor.mockRejectedValue(new Error("no editor"))
      panel.setViewedFile(makeFile({ line: null }))

      presenter.handleOpenInEditor()
      await Promise.resolve()
      await Promise.resolve()

      expect(files.openInEditor).toHaveBeenCalledTimes(1)
    })
  })
})
