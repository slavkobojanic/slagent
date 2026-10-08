import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OpenProjectPresenter } from "@/features/library/sidebar/open-project/open-project-presenter/open-project-presenter"
import { OpenProjectStore } from "@/features/library/sidebar/open-project/open-project-store/open-project-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { createMockInstance } from "@/test/create-mock-instance"

function project(id: string): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }
}

describe("OpenProjectPresenter", () => {
  describe("handleToggle", () => {
    it("can collapse and then expand the open project's chat list", () => {
      const store = new OpenProjectStore(new LibraryStore())
      const presenter = new OpenProjectPresenter(store, createMockInstance<API>(["newChat"]), nullLog())

      presenter.handleToggle(project("p1"))
      expect(store.isCollapsed("p1")).toBe(true)

      presenter.handleToggle(project("p1"))
      expect(store.isCollapsed("p1")).toBe(false)
    })
  })

  describe("handleNewChat", () => {
    it("can start a draft in the open project", async () => {
      const api = createMockInstance<API>(["newChat"])
      api.newChat.mockResolvedValue(undefined)
      const presenter = new OpenProjectPresenter(new OpenProjectStore(new LibraryStore()), api, nullLog())

      await presenter.handleNewChat()

      expect(api.newChat).toHaveBeenCalledTimes(1)
    })
  })
})
