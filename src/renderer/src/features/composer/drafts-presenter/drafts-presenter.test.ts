import { describe, expect, it, vi } from "vitest"
import { DraftsPresenter } from "@/features/composer/drafts-presenter/drafts-presenter"
import { DraftsStore } from "@/features/composer/drafts-store/drafts-store"

const KEY = "slagent:composer-drafts"

function fakeStorage(saved: string | null = null) {
  return {
    getItem: vi.fn((_key: string) => saved),
    setItem: vi.fn((_key: string, _value: string) => undefined),
  }
}

describe("DraftsPresenter", () => {
  describe("start", () => {
    it("can load the drafts saved in storage", () => {
      const store = new DraftsStore()
      new DraftsPresenter(store, fakeStorage('{"p:c":"saved"}')).start()

      expect(store.read("p:c")).toBe("saved")
    })

    it("can start empty when storage holds something unreadable", () => {
      const store = new DraftsStore()

      expect(() => new DraftsPresenter(store, fakeStorage("not json")).start()).not.toThrow()
      expect(store.drafts).toEqual({})
    })

    it("can drop entries that are not text", () => {
      const store = new DraftsStore()
      new DraftsPresenter(store, fakeStorage('{"a":"x","b":3}')).start()

      expect(store.drafts).toEqual({ a: "x" })
    })
  })

  describe("save", () => {
    it("can write the drafts to storage under the composer key", () => {
      const storage = fakeStorage()
      const presenter = new DraftsPresenter(new DraftsStore(), storage)

      presenter.save("p:c", "hello")

      expect(storage.setItem).toHaveBeenCalledWith(KEY, '{"p:c":"hello"}')
    })

    it("can leave storage alone when a blank draft has nothing to replace", () => {
      const storage = fakeStorage()

      new DraftsPresenter(new DraftsStore(), storage).save("p:c", " ")

      expect(storage.setItem).not.toHaveBeenCalled()
    })

    it("can keep the draft in memory when storage refuses the write", () => {
      const store = new DraftsStore()
      const storage = fakeStorage()
      storage.setItem.mockImplementation(() => {
        throw new Error("full")
      })

      new DraftsPresenter(store, storage).save("p:c", "hello")

      expect(store.read("p:c")).toBe("hello")
    })
  })

  describe("clear", () => {
    it("can remove the chat's draft from storage", () => {
      const store = new DraftsStore()
      const storage = fakeStorage()
      const presenter = new DraftsPresenter(store, storage)
      presenter.save("p:c", "hello")

      presenter.clear("p:c")

      expect(store.read("p:c")).toBe("")
      expect(storage.setItem).toHaveBeenLastCalledWith(KEY, "{}")
    })
  })
})
