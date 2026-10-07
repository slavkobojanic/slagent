import { describe, expect, it } from "vitest"
import { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"

describe("ProjectMenuStore", () => {
  describe("setError", () => {
    it("can hold a project action's error until it is cleared", () => {
      const store = new ProjectMenuStore()

      store.setError("Folder not found")
      expect(store.error).toBe("Folder not found")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
