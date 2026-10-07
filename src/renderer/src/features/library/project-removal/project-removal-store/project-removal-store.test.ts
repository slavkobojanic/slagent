import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"

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

describe("ProjectRemovalStore", () => {
  describe("confirmed", () => {
    it("can be false when no project is waiting", () => {
      expect(new ProjectRemovalStore().confirmed).toBe(false)
    })

    it("can be false while the typed name differs from the project's name", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)
      store.setTyped("atla")

      expect(store.confirmed).toBe(false)
    })

    it("can be true once the typed name matches the project's name", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)
      store.setTyped("atlas")

      expect(store.confirmed).toBe(true)
    })
  })

  describe("canConfirm", () => {
    it("can be false while a removal is running, even when confirmed", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)
      store.setTyped("atlas")
      store.setBusy(true)

      expect(store.canConfirm).toBe(false)
    })

    it("can be true when confirmed and nothing is running", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)
      store.setTyped("atlas")

      expect(store.canConfirm).toBe(true)
    })
  })

  describe("setTarget", () => {
    it("can clear what was typed when a new project is requested", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)
      store.setTyped("atlas")

      store.setTarget(project)

      expect(store.typed).toBe("")
    })

    it("can report the dialog as closed after the target is cleared", () => {
      const store = new ProjectRemovalStore()
      store.setTarget(project)

      store.setTarget(null)

      expect(store.open).toBe(false)
    })
  })
})
