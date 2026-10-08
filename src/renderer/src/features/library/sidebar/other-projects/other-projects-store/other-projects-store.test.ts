import { describe, expect, it } from "vitest"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import { OtherProjectsStore } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function chat(id: string): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

describe("OtherProjectsStore", () => {
  describe("others", () => {
    it("can list every project other than the open one, pinned ones first, then the most recently opened", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [
          project("old-unpinned", { lastOpenedAt: 10 }),
          project("newer-pin", { pinned: true, pinnedAt: 5 }),
          project("open"),
          project("older-pin", { pinned: true, pinnedAt: 1 }),
          project("recent-unpinned", { lastOpenedAt: 20 }),
        ],
        openProjectId: "open",
        chats: [],
        chatsByProject: {},
        openChatId: null,
      })

      expect(new OtherProjectsStore(libraryStore).others.map((item) => item.project.id)).toEqual(["newer-pin", "older-pin", "recent-unpinned", "old-unpinned"])
    })

    it("can carry each project's status", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [project("p1", { running: true })], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null })

      expect(new OtherProjectsStore(libraryStore).others[0]?.status).toBe("running")
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
