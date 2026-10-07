import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { ProjectSummary } from "@shared/types"
import { ProjectRemovalPresenter } from "@/features/library/project-removal/project-removal-presenter/project-removal-presenter"
import { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const project: ProjectSummary = {
  id: "p1",
  path: "/work/atlas",
  name: "atlas",
  pinned: false,
  pinnedAt: 0,
  lastOpenedAt: 0,
  running: false,
  attention: false,
}

describe("ProjectRemovalPresenter", () => {
  let store: ProjectRemovalStore
  let api: MockInstance<API>
  let presenter: ProjectRemovalPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ProjectRemovalStore()
    api = createMockInstance<API>(["removeProject"])
    api.removeProject.mockResolvedValue(undefined)
    presenter = new ProjectRemovalPresenter(store, api)
  })

  describe("handleTypedChange", () => {
    it("can keep what the user typed to confirm", () => {
      store.setTarget(project)

      presenter.handleTypedChange("atl")

      expect(store.typed).toBe("atl")
    })
  })

  describe("handleCancel", () => {
    it("can close the confirmation", () => {
      store.setTarget(project)

      presenter.handleCancel()

      expect(store.target).toBeNull()
    })

    it("can keep the confirmation open while a removal is running", () => {
      store.setTarget(project)
      store.setBusy(true)

      presenter.handleCancel()

      expect(store.target).toEqual(project)
    })
  })

  describe("handleConfirm", () => {
    it("can remove the project with the name as typed and close the confirmation", async () => {
      store.setTarget(project)
      presenter.handleTypedChange("atlas")

      await presenter.handleConfirm()

      expect(api.removeProject).toHaveBeenCalledWith("p1", "atlas")
      expect(store.target).toBeNull()
      expect(store.busy).toBe(false)
    })

    it("can refuse to remove until the typed name matches", async () => {
      store.setTarget(project)
      presenter.handleTypedChange("atl")

      await presenter.handleConfirm()

      expect(api.removeProject).not.toHaveBeenCalled()
    })

    it("can keep the confirmation open and show the error when the removal fails", async () => {
      api.removeProject.mockRejectedValue(new Error("Folder in use"))
      store.setTarget(project)
      presenter.handleTypedChange("atlas")

      await presenter.handleConfirm()

      expect(toast.error).toHaveBeenCalledWith("Folder in use")
      expect(store.target).toEqual(project)
      expect(store.busy).toBe(false)
    })
  })
})
