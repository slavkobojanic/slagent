import { describe, expect, it } from "vitest"
import type { LibraryState, ProjectSummary } from "@shared/types"
import { OpenProjectStore } from "@/features/library/sidebar/open-project/open-project-store/open-project-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function project(id: string): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }
}

function storeWith(library: Partial<LibraryState>): OpenProjectStore {
  const libraryStore = new LibraryStore()
  libraryStore.setLibrary({ projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null, ...library, tasks: library.tasks ?? [] })
  return new OpenProjectStore(libraryStore)
}

describe("OpenProjectStore", () => {
  describe("project", () => {
    it("can be null when no project is open", () => {
      expect(storeWith({ projects: [project("p1")] }).project).toBeNull()
    })

    it("can be the open project", () => {
      expect(storeWith({ projects: [project("p1"), project("p2")], openProjectId: "p2" }).project?.id).toBe("p2")
    })
  })

  describe("isCollapsed and setCollapsed", () => {
    it("can treat every project as expanded by default", () => {
      expect(storeWith({}).isCollapsed("p1")).toBe(false)
    })

    it("can collapse one project without touching the others", () => {
      const store = storeWith({})

      store.setCollapsed("p1", true)

      expect(store.isCollapsed("p1")).toBe(true)
      expect(store.isCollapsed("p2")).toBe(false)
    })
  })

  describe("collapsed", () => {
    it("can follow the open project's collapse state", () => {
      const store = storeWith({ projects: [project("p1")], openProjectId: "p1" })

      store.setCollapsed("p1", true)

      expect(store.collapsed).toBe(true)
    })

    it("can be false when no project is open", () => {
      expect(storeWith({}).collapsed).toBe(false)
    })
  })
})
