import { describe, expect, it } from "vitest"
import type { FileView } from "@shared/types"
import { PanelStore } from "@/state/panel/panel-store/panel-store"

const file: FileView = {
  path: "src/app.ts",
  absolutePath: "/work/src/app.ts",
  line: 3,
  contents: "",
  size: 0,
  binary: false,
  truncated: false,
}

describe("PanelStore", () => {
  describe("setOpen", () => {
    it("can open the panel", () => {
      const store = new PanelStore()

      store.setOpen(true)

      expect(store.open).toBe(true)
    })
  })

  describe("setTab", () => {
    it("can switch to the plan tab", () => {
      const store = new PanelStore()

      store.setTab("plan")

      expect(store.tab).toBe("plan")
    })
  })

  describe("setViewedFile", () => {
    it("can hold the file that is open in the panel", () => {
      const store = new PanelStore()

      store.setViewedFile(file)

      expect(store.viewedFile).toEqual(file)
    })

    it("can clear the open file", () => {
      const store = new PanelStore()
      store.setViewedFile(file)

      store.setViewedFile(null)

      expect(store.viewedFile).toBeNull()
    })
  })
})
