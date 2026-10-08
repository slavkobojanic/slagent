import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OtherProjectsPresenter } from "@/features/library/sidebar/other-projects/other-projects-presenter/other-projects-presenter"
import { NO_PROJECT_ID, OtherProjectsStore } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { createMockInstance } from "@/test/create-mock-instance"

const atlas: ProjectSummary = { id: "p1", path: "/work/p1", name: "Atlas", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

// jsdom has no matchMedia. The stub pretends the reduced-motion setting is off.
const matchMedia = () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) as unknown as MediaQueryList

function presenter(api = createMockInstance<API>(["newChat"])) {
  const store = new OtherProjectsStore(new LibraryStore())
  return { store, api, presenter: new OtherProjectsPresenter(store, api, { matchMedia } as unknown as Window, nullLog()) }
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

  describe("handleNewChat", () => {
    it("can start a draft in the project, naming it", async () => {
      const { api, presenter: subject } = presenter()

      await subject.handleNewChat(atlas)

      expect(api.newChat).toHaveBeenCalledWith("p1")
    })

    it("can create a chat project instead when the project is the fake No project group", async () => {
      const { api, presenter: subject } = presenter(createMockInstance<API>(["newChat", "createChatProject"]))

      await subject.handleNewChat({ ...atlas, id: NO_PROJECT_ID, name: "No project" })

      expect(api.createChatProject).toHaveBeenCalled()
      expect(api.newChat).not.toHaveBeenCalled()
    })
  })
})
