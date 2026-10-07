import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"

const SIDEBAR_KEY = "slagent:sidebar-width"
const CHANGES_KEY = "slagent:changes-width"

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width })
}

function press(clientX: number, button = 0) {
  return new MouseEvent("pointerdown", { button, clientX, cancelable: true })
}

function move(clientX: number) {
  window.dispatchEvent(new MouseEvent("pointermove", { clientX }))
}

function release() {
  window.dispatchEvent(new MouseEvent("pointerup"))
}

describe("LayoutPresenter", () => {
  let store: LayoutStore
  let presenter: LayoutPresenter

  beforeEach(() => {
    window.localStorage.clear()
    setViewport(1200)
    store = new LayoutStore()
    presenter = new LayoutPresenter(store, window)
  })

  afterEach(() => {
    presenter.stop()
    document.body.classList.remove("resizing")
  })

  describe("start", () => {
    it("can restore a stored sidebar width that is within its bounds", () => {
      window.localStorage.setItem(SIDEBAR_KEY, "300")

      presenter.start()

      expect(store.sidebarWidth).toBe(300)
    })

    it("can clamp a stored sidebar width to 40% of the window", () => {
      setViewport(1000)
      window.localStorage.setItem(SIDEBAR_KEY, "900")

      presenter.start()

      expect(store.sidebarWidth).toBe(400)
    })

    it("can fall back to the default width when the stored value is not a positive number", () => {
      window.localStorage.setItem(SIDEBAR_KEY, "nope")

      presenter.start()

      expect(store.sidebarWidth).toBe(256)
    })

    it("can restore the changes width from its own key", () => {
      setViewport(1000)
      window.localStorage.setItem(CHANGES_KEY, "400")

      presenter.start()

      expect(store.diffWidth).toBe(400)
    })
  })

  describe("handleResizeStart", () => {
    it("can widen the sidebar as the pointer moves right", () => {
      presenter.start()

      presenter.handleResizeStart("sidebar", press(300))
      move(340)

      expect(store.sidebarWidth).toBe(296)
    })

    it("can clamp the sidebar to its minimum when dragged far left", () => {
      presenter.start()

      presenter.handleResizeStart("sidebar", press(300))
      move(-500)

      expect(store.sidebarWidth).toBe(200)
    })

    it("can clamp the sidebar to 40% of the window when dragged far right", () => {
      setViewport(1000)
      presenter.start()

      presenter.handleResizeStart("sidebar", press(300))
      move(900)

      expect(store.sidebarWidth).toBe(400)
    })

    it("can grow the changes panel as the pointer moves left", () => {
      presenter.start()

      presenter.handleResizeStart("diff", press(300))
      move(250)

      expect(store.diffWidth).toBe(610)
    })

    it("can mark the edge as resizing and the body while dragging, then clear both on pointer up", () => {
      presenter.start()

      presenter.handleResizeStart("sidebar", press(300))
      expect(store.resizing).toBe("sidebar")
      expect(document.body.classList.contains("resizing")).toBe(true)

      release()

      expect(store.resizing).toBeNull()
      expect(document.body.classList.contains("resizing")).toBe(false)
    })

    it("can persist the width under its key when the drag ends", () => {
      presenter.start()

      presenter.handleResizeStart("sidebar", press(300))
      move(340)
      release()

      expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe("296")
    })

    it("can ignore a press that is not the primary button", () => {
      presenter.start()
      const event = press(300, 2)

      presenter.handleResizeStart("sidebar", event)
      move(500)

      expect(event.defaultPrevented).toBe(false)
      expect(store.sidebarWidth).toBe(256)
    })

    it("can stop following the pointer once the drag has ended", () => {
      presenter.start()
      presenter.handleResizeStart("sidebar", press(300))
      move(340)
      release()

      move(600)

      expect(store.sidebarWidth).toBe(296)
    })
  })

  describe("handleResizeReset", () => {
    it("can restore the default width and forget the stored one", () => {
      presenter.start()
      presenter.handleResizeStart("sidebar", press(300))
      move(400)
      release()

      presenter.handleResizeReset("sidebar")

      expect(store.sidebarWidth).toBe(256)
      expect(window.localStorage.getItem(SIDEBAR_KEY)).toBeNull()
    })
  })

  describe("toggleSidebar", () => {
    it("can flip the sidebar between open and closed", () => {
      presenter.toggleSidebar()
      expect(store.sidebarOpen).toBe(false)

      presenter.toggleSidebar()
      expect(store.sidebarOpen).toBe(true)
    })
  })

  describe("viewport resize", () => {
    it("can pull a pane back inside the window when the window shrinks", () => {
      window.localStorage.setItem(SIDEBAR_KEY, "400")
      presenter.start()

      setViewport(600)
      window.dispatchEvent(new Event("resize"))

      expect(store.sidebarWidth).toBe(240)
    })
  })

  describe("stop", () => {
    it("can stop following the pointer when stopped mid-drag", () => {
      presenter.start()
      presenter.handleResizeStart("sidebar", press(300))
      move(340)

      presenter.stop()
      move(600)

      expect(store.resizing).toBeNull()
      expect(store.sidebarWidth).toBe(296)
    })
  })
})
