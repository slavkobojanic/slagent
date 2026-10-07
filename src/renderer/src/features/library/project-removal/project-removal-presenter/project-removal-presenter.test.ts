import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { toast } from "sonner"
import type { ProjectSummary } from "@shared/types"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { ProjectRemovalPresenter } from "@/features/library/project-removal/project-removal-presenter/project-removal-presenter"
import { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import { createMockInstance } from "@/test/create-mock-instance"

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
  let library: { removeProject: Mock }
  let presenter: ProjectRemovalPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ProjectRemovalStore()
    library = createMockInstance<LibraryService>(["removeProject"])
    library.removeProject.mockResolvedValue(undefined)
    presenter = new ProjectRemovalPresenter(store, library)
  })

  describe("handleRequest", () => {
    it("can open the confirmation for the project it is given", () => {
      presenter.handleRequest(project)

      expect(store.target).toBe(project)
    })
  })

  describe("handleTypedChange", () => {
    it("can keep what the user typed to confirm", () => {
      presenter.handleRequest(project)

      presenter.handleTypedChange("atl")

      expect(store.typed).toBe("atl")
    })
  })

  describe("handleCancel", () => {
    it("can close the confirmation", () => {
      presenter.handleRequest(project)

      presenter.handleCancel()

      expect(store.target).toBeNull()
    })

    it("can keep the confirmation open while a removal is running", () => {
      presenter.handleRequest(project)
      store.setBusy(true)

      presenter.handleCancel()

      expect(store.target).toBe(project)
    })
  })

  describe("handleConfirm", () => {
    it("can remove the project with the name as typed and close the confirmation", async () => {
      presenter.handleRequest(project)
      presenter.handleTypedChange("atlas")

      await presenter.handleConfirm()

      expect(library.removeProject).toHaveBeenCalledWith("p1", "atlas")
      expect(store.target).toBeNull()
      expect(store.busy).toBe(false)
    })

    it("can refuse to remove until the typed name matches", async () => {
      presenter.handleRequest(project)
      presenter.handleTypedChange("atl")

      await presenter.handleConfirm()

      expect(library.removeProject).not.toHaveBeenCalled()
    })

    it("can keep the confirmation open and show the error when the removal fails", async () => {
      library.removeProject.mockRejectedValue(new Error("Folder in use"))
      presenter.handleRequest(project)
      presenter.handleTypedChange("atlas")

      await presenter.handleConfirm()

      expect(toast.error).toHaveBeenCalledWith("Folder in use")
      expect(store.target).toBe(project)
      expect(store.busy).toBe(false)
    })
  })
})
