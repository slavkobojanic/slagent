import { describe, expect, it } from "vitest"
import type { LibraryState } from "@shared/types"
import { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { chat, project } from "@/storybook/sample"

function withLibrary(library: Partial<LibraryState>): MobileStore {
  const libraryStore = new LibraryStore()
  libraryStore.setLibrary({ projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null, ...library, tasks: library.tasks ?? [] })
  return new MobileStore(libraryStore)
}

describe("MobileStore", () => {
  describe("chatTitle", () => {
    it("can name the open chat", () => {
      const store = withLibrary({ openProjectId: "p1", openChatId: "c1", chats: [chat({ id: "c1", title: "Add iOS" })] })
      expect(store.chatTitle).toBe("Add iOS")
    })

    it("can call a draft a new chat", () => {
      expect(withLibrary({ openProjectId: "p1" }).chatTitle).toBe("New chat")
    })
  })

  describe("projectName", () => {
    it("can name the open code project", () => {
      expect(withLibrary({ projects: [project({ id: "p1", name: "slagent" })], openProjectId: "p1" }).projectName).toBe("slagent")
    })

    it("can leave out a chat project, which has no folder to name", () => {
      expect(withLibrary({ projects: [project({ id: "p1", mode: "chat" })], openProjectId: "p1" }).projectName).toBeNull()
    })

    it("can be null when no project is open", () => {
      expect(withLibrary({}).projectName).toBeNull()
    })
  })

  describe("layout", () => {
    it("can be a phone until the window says otherwise", () => {
      const store = withLibrary({})
      expect(store.layout).toBe("phone")
      expect(store.tablet).toBe(false)
    })

    it("can be a tablet in either orientation", () => {
      const store = withLibrary({})
      store.setLayout("portrait")
      expect(store.tablet).toBe(true)
    })

    it("can toggle the docked chat list", () => {
      const store = withLibrary({})
      store.setSidebarOpen(false)
      expect(store.sidebarOpen).toBe(false)
    })
  })

  describe("setScreen", () => {
    it("can clear the error when the screen changes", () => {
      const store = withLibrary({})
      store.setError("Nope")
      store.setScreen("chat")
      expect(store.screen).toBe("chat")
      expect(store.error).toBeNull()
    })
  })
})
