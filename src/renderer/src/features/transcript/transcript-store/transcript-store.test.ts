import { describe, expect, it } from "vitest"
import { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"

describe("TranscriptStore", () => {
  describe("setJumpTo", () => {
    it("can hold a search result's message until it is shown", () => {
      const store = new TranscriptStore()

      store.setJumpTo("m7")

      expect(store.jumpTo).toBe("m7")
    })
  })

  describe("setAtBottom", () => {
    it("can track whether the reader is at the bottom", () => {
      const store = new TranscriptStore()

      store.setAtBottom(false)

      expect(store.atBottom).toBe(false)
    })
  })
})
