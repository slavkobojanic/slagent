import { afterEach, describe, expect, it, vi } from "vitest"
import { MobileChatListPresenter } from "@/features/mobile/chat-list/chat-list-presenter/chat-list-presenter"
import { MobileChatListStore } from "@/features/mobile/chat-list/chat-list-store/chat-list-store"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"

afterEach(() => {
  vi.useRealTimers()
})

describe("MobileChatListPresenter", () => {
  describe("start", () => {
    it("can move the clock forward until it stops", () => {
      vi.useFakeTimers()
      vi.setSystemTime(1000)
      const store = new MobileChatListStore(new LibraryStore())
      const presenter = new MobileChatListPresenter(store, window, nullLog())
      presenter.start()
      vi.setSystemTime(40_000)
      vi.advanceTimersByTime(30_000)
      expect(store.now).toBeGreaterThanOrEqual(40_000)
      presenter.stop()
      const stopped = store.now
      vi.advanceTimersByTime(60_000)
      expect(store.now).toBe(stopped)
    })
  })
})
