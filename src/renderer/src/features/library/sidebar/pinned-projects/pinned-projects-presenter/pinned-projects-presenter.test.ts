import { describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { ProjectSummary } from "@shared/types"
import { PinnedProjectsPresenter } from "@/features/library/sidebar/pinned-projects/pinned-projects-presenter/pinned-projects-presenter"
import type { API } from "@/ipc/api"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const atlas: ProjectSummary = { id: "p1", path: "/work/p1", name: "Atlas", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

describe("PinnedProjectsPresenter", () => {
  describe("handleOpen", () => {
    it("can open a project by its id", async () => {
      const api = createMockInstance<API>(["openProject"])
      api.openProject.mockResolvedValue(undefined)

      await new PinnedProjectsPresenter(api).handleOpen(atlas)

      expect(api.openProject).toHaveBeenCalledWith("p1")
    })

    it("can show a toast when the project cannot be opened", async () => {
      const api = createMockInstance<API>(["openProject"])
      api.openProject.mockRejectedValue(new Error("Folder is gone"))

      await new PinnedProjectsPresenter(api).handleOpen(atlas)

      expect(toast.error).toHaveBeenCalledWith("Folder is gone")
    })
  })
})
