import { describe, expect, it } from "vitest"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import { NO_PROJECT_ID, OtherProjectsStore } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function chat(id: string): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

describe("OtherProjectsStore", () => {
  describe("others", () => {
    it("can list every code project other than the open one, alphabetical so nothing shuffles", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [
          project("zebra", { lastOpenedAt: 20 }),
          project("mango", { pinned: true, pinnedAt: 5, lastOpenedAt: 10 }),
          project("open"),
          project("apple"),
          project("mango2", { pinned: true, pinnedAt: 1, lastOpenedAt: 0 }),
        ],
        openProjectId: "open",
        chats: [],
        chatsByProject: {},
        openChatId: null,
      })

      expect(new OtherProjectsStore(libraryStore).others.map((item) => item.project.id)).toEqual(["apple", "mango", "mango2", "zebra"])
    })

    it("can leave chat projects out, they belong to the No project group", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("chat", { mode: "chat" }), project("code")],
        openProjectId: null,
        chats: [],
        chatsByProject: {},
        openChatId: null,
      })

      expect(new OtherProjectsStore(libraryStore).others.map((item) => item.project.id)).toEqual(["code"])
    })

    it("can carry each project's status", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [project("p1", { running: true })], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null })

      expect(new OtherProjectsStore(libraryStore).others[0]?.status).toBe("running")
    })
  })

  describe("noProject", () => {
    it("can aggregate the chats of every chat project that is not open, including older records without a mode", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("c1", { mode: "chat" }), project("c2", { mode: "chat" }), project("open-chat", { mode: "chat" }), project("p1")],
        openProjectId: "open-chat",
        chats: [],
        chatsByProject: { c1: [chat("a")], c2: [chat("b")], "open-chat": [chat("c")] },
        openChatId: null,
      })

      const store = new OtherProjectsStore(libraryStore)
      expect(store.noProject?.id).toBe(NO_PROJECT_ID)
      expect(store.chatsOf(NO_PROJECT_ID)).toEqual([chat("a"), chat("b")])
    })

    it("can be absent when no chat project exists or the only one is open", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("c1", { mode: "chat" }), project("p1")],
        openProjectId: "c1",
        chats: [],
        chatsByProject: {},
        openChatId: null,
      })

      const store = new OtherProjectsStore(libraryStore)
      expect(store.noProject).toBeNull()
      expect(store.chatsOf(NO_PROJECT_ID)).toEqual([])
    })
  })

  describe("chatsOf", () => {
    it("can read the project's chats from the library", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [], openProjectId: null, chats: [], chatsByProject: { p1: [chat("c1")] }, openChatId: null })

      expect(new OtherProjectsStore(libraryStore).chatsOf("p1")).toEqual([chat("c1")])
      expect(new OtherProjectsStore(libraryStore).chatsOf("p2")).toEqual([])
    })
  })

  describe("collapse and show-all state", () => {
    it("can start expanded, then collapse, show all, and reduce motion per project", () => {
      const store = new OtherProjectsStore(new LibraryStore())

      expect(store.isCollapsed("p1")).toBe(false)
      store.setCollapsed("p1", true)
      expect(store.isCollapsed("p1")).toBe(true)
      expect(store.isCollapsed("p2")).toBe(false)

      expect(store.isShowingAll("p1")).toBe(false)
      store.setShowAll("p1", true)
      expect(store.isShowingAll("p1")).toBe(true)

      store.setReduceMotion(true)
      expect(store.reduceMotion).toBe(true)
    })
  })
})
