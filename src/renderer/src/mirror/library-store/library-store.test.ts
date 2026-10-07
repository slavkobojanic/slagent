import { describe, expect, it } from "vitest"
import { LibraryStore } from "@/mirror/library-store/library-store"

describe("LibraryStore", () => {
  describe("openProjectId", () => {
    it("can read null before any library has been set", () => {
      expect(new LibraryStore().openProjectId).toBeNull()
    })

    it("can read the project from the library that was set", () => {
      const store = new LibraryStore()

      store.setLibrary({ projects: [], openProjectId: "p2", chats: [], openChatId: null })

      expect(store.openProjectId).toBe("p2")
    })
  })

  describe("openChatId", () => {
    it("can read null before any library has been set", () => {
      expect(new LibraryStore().openChatId).toBeNull()
    })

    it("can read the chat from the library that was set", () => {
      const store = new LibraryStore()

      store.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c7" })

      expect(store.openChatId).toBe("c7")
    })
  })
})
