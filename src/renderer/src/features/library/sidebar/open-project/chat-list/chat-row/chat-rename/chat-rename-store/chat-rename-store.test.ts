import { describe, expect, it } from "vitest"
import { ChatRenameStore } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename-store/chat-rename-store"

describe("ChatRenameStore", () => {
  describe("startRename", () => {
    it("can mark a chat as being renamed with its title as the draft", () => {
      const store = new ChatRenameStore()

      store.startRename("c1", "Plan")

      expect(store.renamingId).toBe("c1")
      expect(store.draft).toBe("Plan")
      expect(store.isRenaming("c1")).toBe(true)
      expect(store.isRenaming("c2")).toBe(false)
    })
  })

  describe("endRename", () => {
    it("can stop renaming without changing the draft", () => {
      const store = new ChatRenameStore()
      store.startRename("c1", "Plan")

      store.endRename()

      expect(store.renamingId).toBeNull()
      expect(store.draft).toBe("Plan")
    })
  })
})
