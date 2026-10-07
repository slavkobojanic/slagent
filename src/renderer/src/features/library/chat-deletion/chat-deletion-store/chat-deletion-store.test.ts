import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"

const chat: ChatSummary = {
  id: "c1",
  title: "Plan",
  pinned: false,
  pinnedAt: 0,
  updatedAt: 0,
  running: false,
  status: "idle",
  finishedAt: null,
}

describe("ChatDeletionStore", () => {
  describe("open", () => {
    it("can be closed when no chat is waiting", () => {
      expect(new ChatDeletionStore().open).toBe(false)
    })

    it("can be open once a chat is waiting", () => {
      const store = new ChatDeletionStore()

      store.setTarget(chat)

      expect(store.open).toBe(true)
    })
  })

  describe("canConfirm", () => {
    it("can be false when no chat is waiting", () => {
      expect(new ChatDeletionStore().canConfirm).toBe(false)
    })

    it("can be false while a delete is running", () => {
      const store = new ChatDeletionStore()
      store.setTarget(chat)
      store.setBusy(true)

      expect(store.canConfirm).toBe(false)
    })

    it("can be true when a chat is waiting and nothing is running", () => {
      const store = new ChatDeletionStore()

      store.setTarget(chat)

      expect(store.canConfirm).toBe(true)
    })
  })

  describe("setTarget", () => {
    it("can clear the waiting chat", () => {
      const store = new ChatDeletionStore()
      store.setTarget(chat)

      store.setTarget(null)

      expect(store.target).toBeNull()
    })
  })
})
