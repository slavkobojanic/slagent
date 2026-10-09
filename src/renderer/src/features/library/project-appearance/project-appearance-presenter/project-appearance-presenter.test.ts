import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { ProjectAppearancePresenter } from "@/features/library/project-appearance/project-appearance-presenter/project-appearance-presenter"
import { ProjectAppearanceStore } from "@/features/library/project-appearance/project-appearance-store/project-appearance-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

const project: ProjectSummary = {
  id: "p1",
  path: "/work/atlas",
  name: "Atlas",
  pinned: false,
  pinnedAt: 0,
  lastOpenedAt: 0,
  running: false,
  attention: false,
}

describe("ProjectAppearancePresenter", () => {
  let store: ProjectAppearanceStore
  let api: ReturnType<typeof createMockInstance<API>>
  let presenter: ProjectAppearancePresenter

  beforeEach(() => {
    store = new ProjectAppearanceStore()
    api = createMockInstance<API>(["setProjectAppearance"])
    presenter = new ProjectAppearancePresenter(store, api, nullLog())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("can close while open", () => {
    store.setTarget(project)

    presenter.handleClose()

    expect(store.open).toBe(false)
  })

  it("can save the appearance and close", async () => {
    api.setProjectAppearance.mockResolvedValue(undefined)
    store.setTarget(project)
    store.setIcon("book")
    store.setColor("rose")

    await presenter.handleConfirm()

    expect(api.setProjectAppearance).toHaveBeenCalledWith("p1", { icon: "book", color: "rose" })
    expect(store.open).toBe(false)
  })

  it("can keep the dialog open when saving fails", async () => {
    api.setProjectAppearance.mockRejectedValue(new Error("Unknown icon."))
    store.setTarget(project)

    await presenter.handleConfirm()

    expect(store.open).toBe(true)
    expect(store.error).toBe("Unknown icon.")
  })

  it("can skip saving while busy", async () => {
    store.setTarget(project)
    store.setBusy(true)

    await presenter.handleConfirm()

    expect(api.setProjectAppearance).not.toHaveBeenCalled()
  })
})
