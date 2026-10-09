import { describe, expect, it, vi } from "vitest"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { nullLog } from "@/log/log"
import { BackSwipeStore } from "@/features/mobile/back-swipe/back-swipe-store/back-swipe-store"
import { BackSwipePresenter, EDGE_PX } from "./back-swipe-presenter"

function touchPoint(x: number, y: number): Touch {
  return { clientX: x, clientY: y } as Touch
}

// jsdom has no TouchEvent, so the touch list is set onto a plain Event.
function fire(window: Window, type: string, touches: Touch[]) {
  const event = new Event(type, { cancelable: true }) as TouchEvent
  Object.defineProperty(event, "touches", { value: touches })
  window.dispatchEvent(event)
  return event
}

function setup(screen: "chats" | "chat") {
  const store = new BackSwipeStore()
  const mobileStore = new MobileStore(new LibraryStore())
  mobileStore.setScreen(screen)
  const back = vi.fn()
  const presenter = new BackSwipePresenter(store, mobileStore, back, window, nullLog())
  presenter.start()

  return { store, back }
}

describe("BackSwipePresenter", () => {
  it("does not track a touch that starts away from the left edge", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(EDGE_PX + 1, 100)])
    fire(window, "touchmove", [touchPoint(EDGE_PX + 1, 100)])
    fire(window, "touchmove", [touchPoint(EDGE_PX + 200, 100)])
    fire(window, "touchend", [])

    expect(store.progress).toBe(0)
    expect(back).not.toHaveBeenCalled()
  })

  it("does not track a touch when the chat list is on screen", () => {
    const { store, back } = setup("chats")

    fire(window, "touchstart", [touchPoint(10, 100)])
    fire(window, "touchmove", [touchPoint(110, 100)])
    fire(window, "touchend", [])

    expect(store.progress).toBe(0)
    expect(back).not.toHaveBeenCalled()
  })

  it("does not claim a drag more vertical than horizontal", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(10, 100)])
    fire(window, "touchmove", [touchPoint(14, 200)])
    fire(window, "touchmove", [touchPoint(20, 400)])
    fire(window, "touchend", [])

    expect(store.progress).toBe(0)
    expect(back).not.toHaveBeenCalled()
  })

  it("follows a claimed horizontal drag and pops back past the commit distance", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(10, 100)])
    const half = fire(window, "touchmove", [touchPoint(58, 104)])
    expect(store.progress).toBeCloseTo(0.5)
    expect(half.defaultPrevented).toBe(true)

    fire(window, "touchmove", [touchPoint(110, 104)])
    expect(store.progress).toBe(1)
    fire(window, "touchend", [])

    expect(back).toHaveBeenCalledTimes(1)
    expect(store.progress).toBe(0)
  })

  it("does not pop back when released before the commit distance", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(10, 100)])
    fire(window, "touchmove", [touchPoint(60, 100)])
    fire(window, "touchend", [])

    expect(store.progress).toBe(0)
    expect(back).not.toHaveBeenCalled()
  })

  it("abandons the swipe on touchcancel", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(10, 100)])
    fire(window, "touchmove", [touchPoint(110, 100)])
    fire(window, "touchcancel", [])

    expect(back).not.toHaveBeenCalled()
    expect(store.progress).toBe(0)
  })

  it("ignores a second finger landing mid-swipe", () => {
    const { store, back } = setup("chat")

    fire(window, "touchstart", [touchPoint(10, 100)])
    fire(window, "touchmove", [touchPoint(110, 100)])
    fire(window, "touchmove", [touchPoint(110, 100), touchPoint(200, 300)])
    fire(window, "touchend", [])

    expect(back).not.toHaveBeenCalled()
    expect(store.progress).toBe(0)
  })
})
