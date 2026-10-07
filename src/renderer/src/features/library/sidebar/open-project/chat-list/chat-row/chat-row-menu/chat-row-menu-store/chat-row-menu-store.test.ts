import { describe, expect, it } from "vitest"
import { ChatRowMenuStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu-store/chat-row-menu-store"

describe("ChatRowMenuStore", () => {
  describe("setChatId", () => {
    it("can record which chat's menu is open", () => {
      const store = new ChatRowMenuStore()

      store.setChatId("c1")

      expect(store.chatId).toBe("c1")
      expect(store.isOpen("c1")).toBe(true)
      expect(store.isOpen("c2")).toBe(false)
    })
  })
})
