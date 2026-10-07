import { describe, expect, it } from "vitest"
import { LayoutStore } from "@/state/layout-store"

describe("LayoutStore", () => {
  describe("setWidth", () => {
    it("can set only the sidebar width when given the sidebar edge", () => {
      const store = new LayoutStore()

      store.setWidth("sidebar", 300)

      expect(store.sidebarWidth).toBe(300)
      expect(store.diffWidth).toBe(560)
    })

    it("can set only the changes width when given the diff edge", () => {
      const store = new LayoutStore()

      store.setWidth("diff", 400)

      expect(store.diffWidth).toBe(400)
      expect(store.sidebarWidth).toBe(256)
    })
  })
})
