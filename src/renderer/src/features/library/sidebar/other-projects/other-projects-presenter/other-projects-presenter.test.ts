import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OtherProjectsPresenter } from "@/features/library/sidebar/other-projects/other-projects-presenter/other-projects-presenter"
import { OtherProjectsStore } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"

const atlas: ProjectSummary = { id: "p1", path: "/work/p1", name: "Atlas", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

// jsdom has no matchMedia. The stub pretends the reduced-motion setting is off.
const matchMedia = () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList

function presenter() {
  const store = new OtherProjectsStore(new LibraryStore())
  return { store, presenter: new OtherProjectsPresenter(store, { matchMedia } as unknown as Window, nullLog()) }
}

describe("OtherProjectsPresenter", () => {
  describe("handleToggle", () => {
    it("can collapse and re-expand a project's chat list", () => {
      const { store, presenter: subject } = presenter()

      subject.handleToggle(atlas)
      expect(store.isCollapsed("p1")).toBe(true)

      subject.handleToggle(atlas)
      expect(store.isCollapsed("p1")).toBe(false)
    })
  })

  describe("show all", () => {
    it("can show and hide a project's hidden chats", () => {
      const { store, presenter: subject } = presenter()

      subject.handleShowAll("p1")
      expect(store.isShowingAll("p1")).toBe(true)

      subject.handleShowLess("p1")
      expect(store.isShowingAll("p1")).toBe(false)
    })
  })
})
