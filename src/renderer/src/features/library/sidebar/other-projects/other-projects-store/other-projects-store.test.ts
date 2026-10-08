import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { PinnedProjectsStore } from "@/features/library/sidebar/pinned-projects/pinned-projects-store/pinned-projects-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

describe("PinnedProjectsStore", () => {
  describe("pinned", () => {
    it("can list pinned projects other than the open one, the most recent pin first", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({
        projects: [
          project("older", { pinned: true, pinnedAt: 1 }),
          project("newer", { pinned: true, pinnedAt: 5 }),
          project("open", { pinned: true, pinnedAt: 9 }),
          project("unpinned"),
        ],
        openProjectId: "open",
        chats: [],
        openChatId: null,
      })

      expect(new PinnedProjectsStore(libraryStore).pinned.map((item) => item.project.id)).toEqual(["newer", "older"])
    })

    it("can carry each project's status", () => {
      const libraryStore = new LibraryStore()
      libraryStore.setLibrary({ projects: [project("p1", { pinned: true, running: true })], openProjectId: null, chats: [], openChatId: null })

      expect(new PinnedProjectsStore(libraryStore).pinned[0]?.status).toBe("running")
    })
  })
})
