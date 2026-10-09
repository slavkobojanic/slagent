import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { ProjectAppearanceStore } from "@/features/library/project-appearance/project-appearance-store/project-appearance-store"

const project: ProjectSummary = {
  id: "p1",
  path: "/work/atlas",
  name: "Atlas",
  pinned: false,
  pinnedAt: 0,
  lastOpenedAt: 0,
  running: false,
  attention: false,
  icon: "rocket",
  color: "blue",
}

describe("ProjectAppearanceStore", () => {
  it("can open a project with its current appearance", () => {
    const store = new ProjectAppearanceStore()

    store.setTarget(project)

    expect(store.open).toBe(true)
    expect(store.icon).toBe("rocket")
    expect(store.color).toBe("blue")
  })

  it("can pick a new icon and colour", () => {
    const store = new ProjectAppearanceStore()
    store.setTarget(project)

    store.setIcon("book")
    store.setColor("rose")

    expect(store.icon).toBe("book")
    expect(store.color).toBe("rose")
  })

  it("can clear an icon by picking none", () => {
    const store = new ProjectAppearanceStore()
    store.setTarget(project)

    store.setIcon(null)

    expect(store.icon).toBe(null)
  })

  it("can reset the appearance of a project without one", () => {
    const store = new ProjectAppearanceStore()
    store.setTarget({ ...project, icon: undefined, color: undefined })

    expect(store.icon).toBe(null)
    expect(store.color).toBe(null)
  })

  it("can close and forget the draft", () => {
    const store = new ProjectAppearanceStore()
    store.setTarget(project)
    store.setIcon("book")

    store.setTarget(null)

    expect(store.open).toBe(false)
    expect(store.icon).toBe(null)
  })

  it("can allow saving while not busy", () => {
    const store = new ProjectAppearanceStore()
    store.setTarget(project)

    expect(store.canConfirm).toBe(true)

    store.setBusy(true)

    expect(store.canConfirm).toBe(false)
  })
})
