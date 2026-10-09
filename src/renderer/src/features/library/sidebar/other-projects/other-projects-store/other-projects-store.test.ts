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
    it("can list every code project, the open one included, alphabetical so nothing shuffles", () => {
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
        openChatId: null, tasks: [],
      })

      expect(new OtherProjectsStore(libraryStore).others.map((item) => item.project.id)).toEqual(["apple", "mango", "mango2", "open", "zebra"])
    })

    it("can mark the open project active and the rest not", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("p1"), project("p2")],
        openProjectId: "p2",
        chats: [],
        chatsByProject: {},
        openChatId: null, tasks: [],
      })

      const others = new OtherProjectsStore(libraryStore).others
      expect(others.map((item) => item.active)).toEqual([false, true])
    })

    it("can leave chat projects out, they belong to the No project group", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("chat", { mode: "chat" }), project("code")],
        openProjectId: null,
        chats: [],
        chatsByProject: {},
        openChatId: null, tasks: [],
      })

      expect(new OtherProjectsStore(libraryStore).others.map((item) => item.project.id)).toEqual(["code"])
    })

  })

  describe("noProject", () => {
    it("can aggregate the chats of every chat project, the open one included, including older records without a mode", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("c1", { mode: "chat" }), project("c2", { mode: "chat" }), project("open-chat", { mode: "chat" }), project("p1")],
        openProjectId: "open-chat",
        chats: [chat("c")],
        chatsByProject: { c1: [chat("a")], c2: [chat("b")] },
        openChatId: null, tasks: [],
      })

      const store = new OtherProjectsStore(libraryStore)
      expect(store.noProject?.id).toBe(NO_PROJECT_ID)
      expect(store.chatsOf(NO_PROJECT_ID)).toEqual([chat("a"), chat("b"), chat("c")])
    })

    it("can be absent when no chat project exists", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("p1")],
        openProjectId: "p1",
        chats: [],
        chatsByProject: {},
        openChatId: null, tasks: [],
      })

      const store = new OtherProjectsStore(libraryStore)
      expect(store.noProject).toBeNull()
      expect(store.chatsOf(NO_PROJECT_ID)).toEqual([])
    })
  })

  describe("chatsOf", () => {
    it("can read the project's chats from the library, the open project's from `chats`", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [project("p1"), project("p2")],
        openProjectId: "p2",
        chats: [chat("c2")],
        chatsByProject: { p1: [chat("c1")] },
        openChatId: null, tasks: [],
      })

      const store = new OtherProjectsStore(libraryStore)
      expect(store.chatsOf("p1")).toEqual([chat("c1")])
      expect(store.chatsOf("p2")).toEqual([chat("c2")])
      expect(store.chatsOf("p3")).toEqual([])
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
