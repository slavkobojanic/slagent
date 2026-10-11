import { describe, expect, it, vi } from "vitest"
import { ScreenTransitionPresenter } from "@/features/mobile/screen-transition/screen-transition-presenter/screen-transition-presenter"
import { ScreenTransitionStore } from "@/features/mobile/screen-transition/screen-transition-store/screen-transition-store"

describe("ScreenTransitionPresenter", () => {
  it("pushes the changes over the chat, then pops back to the chat", () => {
    vi.useFakeTimers()
    try {
      const store = new ScreenTransitionStore("chat")
      const presenter = new ScreenTransitionPresenter(store, window)

      presenter.handleScreenChange("changes")

      expect(store.current).toBe("changes")
      expect(store.leaving).toBe("chat")
      expect(store.direction).toBe("push")
      expect(store.entering).toBe(true)

      vi.advanceTimersByTime(300)

      expect(store.leaving).toBeNull()
      expect(store.entering).toBe(false)

      presenter.handleScreenChange("chat")

      expect(store.current).toBe("chat")
      expect(store.leaving).toBe("changes")
      expect(store.direction).toBe("pop")
      expect(store.entering).toBe(true)

      vi.advanceTimersByTime(300)

      expect(store.leaving).toBeNull()
      expect(store.entering).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("keeps the transition state alone when the screen does not change", () => {
    const store = new ScreenTransitionStore("chats")
    const presenter = new ScreenTransitionPresenter(store, window)

    presenter.handleScreenChange("chats")

    expect(store.leaving).toBeNull()
    expect(store.entering).toBe(false)
  })

  it("can stop listening before a pending transition settles", () => {
    vi.useFakeTimers()
    try {
      const store = new ScreenTransitionStore("chat")
      const presenter = new ScreenTransitionPresenter(store, window)

      presenter.handleScreenChange("changes")
      presenter.stop()

      vi.advanceTimersByTime(300)

      expect(store.leaving).toBe("chat")
      expect(store.entering).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
