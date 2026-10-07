import { describe, expect, it, vi } from "vitest"
import { PromptHistoryPresenter } from "@/features/composer/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"

const KEY = "slagent:prompt-history"

function fakeStorage(saved: string | null = null) {
  return {
    getItem: vi.fn((_key: string) => saved),
    setItem: vi.fn((_key: string, _value: string) => undefined),
  }
}

describe("PromptHistoryPresenter", () => {
  describe("start", () => {
    it("can load the prompts saved in storage", () => {
      const store = new PromptHistoryStore()
      new PromptHistoryPresenter(store, fakeStorage('["a","b"]')).start()

      expect(store.items).toEqual(["a", "b"])
    })

    it("can start empty when storage holds something other than a list", () => {
      const store = new PromptHistoryStore()
      new PromptHistoryPresenter(store, fakeStorage('{"a":1}')).start()

      expect(store.items).toEqual([])
    })

    it("can keep only the text entries in storage", () => {
      const store = new PromptHistoryStore()
      new PromptHistoryPresenter(store, fakeStorage('["a", 3]')).start()

      expect(store.items).toEqual(["a"])
    })
  })

  describe("remember", () => {
    it("can save the prompt to storage", () => {
      const storage = fakeStorage()

      new PromptHistoryPresenter(new PromptHistoryStore(), storage).remember("hi")

      expect(storage.setItem).toHaveBeenCalledWith(KEY, '["hi"]')
    })

    it("can leave storage alone for a blank prompt", () => {
      const storage = fakeStorage()

      new PromptHistoryPresenter(new PromptHistoryStore(), storage).remember("  ")

      expect(storage.setItem).not.toHaveBeenCalled()
    })
  })
})
