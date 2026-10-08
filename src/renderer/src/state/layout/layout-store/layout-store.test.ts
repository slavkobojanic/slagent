import { describe, expect, it } from "vitest"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"

describe("LayoutStore", () => {
  describe("setSize", () => {
    it("can set only the sidebar width when given the sidebar edge", () => {
      const store = new LayoutStore()

      store.setSize("sidebar", 300)

      expect(store.sidebarWidth).toBe(300)
      expect(store.diffWidth).toBe(560)
      expect(store.terminalHeight).toBe(288)
    })

    it("can set only the changes width when given the diff edge", () => {
      const store = new LayoutStore()

      store.setSize("diff", 400)

      expect(store.diffWidth).toBe(400)
      expect(store.sidebarWidth).toBe(256)
      expect(store.terminalHeight).toBe(288)
    })

    it("can set only the terminal height when given the terminal edge", () => {
      const store = new LayoutStore()

      store.setSize("terminal", 360)

      expect(store.terminalHeight).toBe(360)
      expect(store.sidebarWidth).toBe(256)
      expect(store.diffWidth).toBe(560)
    })
  })

  describe("sizeOf", () => {
    it("can read back the size of each edge", () => {
      const store = new LayoutStore()

      store.setSize("sidebar", 300)
      store.setSize("diff", 400)
      store.setSize("terminal", 360)

      expect(store.sizeOf("sidebar")).toBe(300)
      expect(store.sizeOf("diff")).toBe(400)
      expect(store.sizeOf("terminal")).toBe(360)
    })
  })
})
