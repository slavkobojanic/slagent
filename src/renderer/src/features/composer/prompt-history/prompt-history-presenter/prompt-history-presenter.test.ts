import { beforeEach, describe, expect, it, vi } from "vitest"
import { type HistoryKeyEvent, PromptHistoryPresenter } from "@/features/composer/prompt-history/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"

const STORAGE_KEY = "slagent:prompt-history"

function keyEvent(key: string, init: { shiftKey?: boolean; ctrlKey?: boolean } = {}): HistoryKeyEvent {
  return { key, shiftKey: init.shiftKey ?? false, ctrlKey: init.ctrlKey ?? false, preventDefault: vi.fn() }
}

function setup(items: string[] = []) {
  const store = new PromptHistoryStore()
  store.replace(items)
  const presenter = new PromptHistoryPresenter(store, window)
  return { store, presenter }
}

describe("PromptHistoryPresenter", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe("start", () => {
    it("can load the saved prompts, keeping only the text entries", () => {
      const { store, presenter } = setup()
      window.localStorage.setItem(STORAGE_KEY, '["a", 3, "b"]')

      presenter.start()

      expect(store.items).toEqual(["a", "b"])
    })

    it("can start empty when storage holds something other than a list", () => {
      const { store, presenter } = setup()
      window.localStorage.setItem(STORAGE_KEY, '{"a":1}')

      presenter.start()

      expect(store.items).toEqual([])
    })

    it("can start empty when storage holds something unreadable", () => {
      const { store, presenter } = setup()
      window.localStorage.setItem(STORAGE_KEY, "not json")

      presenter.start()

      expect(store.items).toEqual([])
    })
  })

  describe("remember", () => {
    it("can save the sent prompt", () => {
      const { presenter } = setup()

      presenter.remember("open @a.ts please")

      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('["open @a.ts please"]')
    })

    it("can skip saving blank text", () => {
      const { presenter } = setup()

      presenter.remember("  ")

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe("choose", () => {
    it("can close the search and return the chosen prompt", () => {
      const { store, presenter } = setup(["earlier prompt"])
      store.setQuery("")

      expect(presenter.choose(0)).toBe("earlier prompt")
      expect(store.query).toBeNull()
    })

    it("can return null when there is no row at that index", () => {
      const { store, presenter } = setup(["a"])
      store.setQuery("")

      expect(presenter.choose(5)).toBeNull()
      expect(store.query).toBe("")
    })
  })

  describe("handleSearchKey", () => {
    it("can open the search on Ctrl+R with the current text as its query", () => {
      const { store, presenter } = setup()
      const event = keyEvent("r", { ctrlKey: true })

      expect(presenter.handleSearchKey(event, "draft")).toEqual({ handled: true, text: null })
      expect(store.query).toBe("draft")
      expect(event.preventDefault).toHaveBeenCalledTimes(1)
    })

    it("can leave other keys alone while the search is closed", () => {
      const { presenter } = setup(["a"])

      expect(presenter.handleSearchKey(keyEvent("ArrowUp"), "")).toEqual({ handled: false, text: null })
    })

    it("can close the search on Escape", () => {
      const { store, presenter } = setup(["a"])
      store.setQuery("")

      expect(presenter.handleSearchKey(keyEvent("Escape"), "").handled).toBe(true)
      expect(store.query).toBeNull()
    })

    it("can swallow Enter so nothing is sent while the search has no matches", () => {
      const { store, presenter } = setup(["a"])
      store.setQuery("zzz")
      const event = keyEvent("Enter")

      expect(presenter.handleSearchKey(event, "zzz")).toEqual({ handled: true, text: null })
      expect(event.preventDefault).toHaveBeenCalledTimes(1)
    })

    it("can let typing through while the search has no matches", () => {
      const { store, presenter } = setup(["a"])
      store.setQuery("zzz")

      expect(presenter.handleSearchKey(keyEvent("x"), "zzz").handled).toBe(false)
    })

    it("can move the selection with the arrow keys, stopping at each end", () => {
      const { store, presenter } = setup(["a", "b"])
      store.setQuery("")

      presenter.handleSearchKey(keyEvent("ArrowDown"), "")
      presenter.handleSearchKey(keyEvent("ArrowDown"), "")
      expect(store.active).toBe(1)

      presenter.handleSearchKey(keyEvent("ArrowUp"), "")
      presenter.handleSearchKey(keyEvent("ArrowUp"), "")
      expect(store.active).toBe(0)
    })

    it("can return the selected prompt on Enter", () => {
      const { store, presenter } = setup(["a", "b"])
      store.setQuery("")
      store.setActive(1)

      expect(presenter.handleSearchKey(keyEvent("Enter"), "")).toEqual({ handled: true, text: "a" })
      expect(store.query).toBeNull()
    })

    it("can return the selected prompt on Tab", () => {
      const { store, presenter } = setup(["a"])
      store.setQuery("")

      expect(presenter.handleSearchKey(keyEvent("Tab"), "")).toEqual({ handled: true, text: "a" })
    })
  })

  describe("step", () => {
    it("can recall the newest prompt and walk back and forward to the unsent text", () => {
      const { presenter } = setup(["one", "two"])

      expect(presenter.step(-1, "unsent", 0)).toEqual({ handled: true, text: "two" })
      expect(presenter.step(-1, "two", 0)).toEqual({ handled: true, text: "one" })
      expect(presenter.step(1, "one", 0)).toEqual({ handled: true, text: "two" })
      expect(presenter.step(1, "two", 0)).toEqual({ handled: true, text: "unsent" })
    })

    it("can hold at the oldest prompt", () => {
      const { presenter } = setup(["one"])
      presenter.step(-1, "", 0)

      expect(presenter.step(-1, "one", 0)).toEqual({ handled: true, text: null })
    })

    it("can leave ArrowUp to the caret when a line break sits above it", () => {
      const { presenter } = setup(["one"])

      expect(presenter.step(-1, "a\nb", 3).handled).toBe(false)
    })

    it("can leave ArrowDown alone when no prompt is being recalled", () => {
      const { presenter } = setup(["one"])

      expect(presenter.step(1, "typed", 0).handled).toBe(false)
    })

    it("can leave the arrows alone while the search is open", () => {
      const { store, presenter } = setup(["one"])
      store.setQuery("")

      expect(presenter.step(-1, "", 0).handled).toBe(false)
    })

    it("can leave the arrows alone with no history", () => {
      const { presenter } = setup()

      expect(presenter.step(-1, "", 0).handled).toBe(false)
    })
  })
})
