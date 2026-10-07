import { beforeEach, describe, expect, it } from "vitest"
import type { API } from "@/ipc/api"
import { ProjectMenuPresenter } from "@/features/shell/shell-header/project-menu/project-menu-presenter/project-menu-presenter"
import { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"
import { nullLog } from "@/log/log"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

describe("ProjectMenuPresenter", () => {
  let store: ProjectMenuStore
  let api: MockInstance<API>
  let presenter: ProjectMenuPresenter

  beforeEach(() => {
    store = new ProjectMenuStore()
    api = createMockInstance<API>(["openProject", "chooseFolder"])
    api.openProject.mockResolvedValue(undefined)
    api.chooseFolder.mockResolvedValue(undefined)
    presenter = new ProjectMenuPresenter(store, api, nullLog())
  })

  describe("openProject", () => {
    it("can open the project through the api", async () => {
      await presenter.openProject("p1")

      expect(api.openProject).toHaveBeenCalledWith("p1")
    })

    it("can record the error when the project cannot be opened", async () => {
      api.openProject.mockRejectedValue(new Error("Project folder is gone"))

      await presenter.openProject("p1")

      expect(store.error).toBe("Project folder is gone")
    })

    it("can clear an earlier error before it tries again", async () => {
      store.setError("Earlier failure")

      await presenter.openProject("p1")

      expect(store.error).toBeNull()
    })
  })

  describe("chooseFolder", () => {
    it("can open the folder picker through the api", async () => {
      await presenter.chooseFolder()

      expect(api.chooseFolder).toHaveBeenCalledTimes(1)
    })

    it("can record the error when the folder picker fails", async () => {
      api.chooseFolder.mockRejectedValue(new Error("Picker unavailable"))

      await presenter.chooseFolder()

      expect(store.error).toBe("Picker unavailable")
    })
  })
})
