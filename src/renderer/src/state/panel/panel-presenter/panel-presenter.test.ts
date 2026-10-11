import type { API } from "@/ipc/api"
import { describe, expect, it } from "vitest"
import type { FileView } from "@shared/types"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { nullLog } from "@/log/log"

const file: FileView = {
  path: "src/app.ts",
  absolutePath: "/work/src/app.ts",
  line: null,
  contents: "export {}",
  size: 9,
  binary: false,
  truncated: false,
}

function setup() {
  const files = createMockInstance<API>(["readFile"])
  const store = new PanelStore()
  const presenter = new PanelPresenter(store, files, nullLog())
  return { files, store, presenter }
}

describe("PanelPresenter", () => {
  describe("showPlan", () => {
    it("can switch to the plan tab and open the panel", () => {
      const { store, presenter } = setup()

      presenter.showPlan()

      expect(store.tab).toBe("plan")
      expect(store.open).toBe(true)
    })
  })
  describe("openFile", () => {
    it("can set the viewed file, switch to the file tab and open the panel", async () => {
      const { files, store, presenter } = setup()
      files.readFile.mockResolvedValue(file)

      await presenter.openFile("src/app.ts")

      expect(files.readFile).toHaveBeenCalledWith("src/app.ts")
      expect(store.viewedFile).toEqual(file)
      expect(store.tab).toBe("file")
      expect(store.open).toBe(true)
    })

    it("can pass the line as a :line suffix on the path", async () => {
      const { files, presenter } = setup()
      files.readFile.mockResolvedValue(file)

      await presenter.openFile("src/app.ts", 12)

      expect(files.readFile).toHaveBeenCalledWith("src/app.ts:12")
    })

    it("can leave the panel alone when the path is not a file", async () => {
      const { files, store, presenter } = setup()
      files.readFile.mockResolvedValue(null)

      await presenter.openFile("not-a-file")

      expect(store.viewedFile).toBeNull()
      expect(store.tab).toBe("changes")
      expect(store.open).toBe(false)
    })

    it("can leave the panel alone when reading the file throws", async () => {
      const { files, store, presenter } = setup()
      files.readFile.mockRejectedValue(new Error("unreadable"))

      await presenter.openFile("src/app.ts")

      expect(store.viewedFile).toBeNull()
      expect(store.open).toBe(false)
    })
  })

  describe("showFile", () => {
    it("can show a file that has already been read without reading it again", () => {
      const { files, store, presenter } = setup()

      presenter.showFile(file)

      expect(files.readFile).not.toHaveBeenCalled()
      expect(store.viewedFile).toEqual(file)
    })
  })

  describe("selectTab", () => {
    it("can select the plan tab", () => {
      const { store, presenter } = setup()

      presenter.selectTab("plan")

      expect(store.tab).toBe("plan")
    })
  })

  describe("setOpen", () => {
    it("can close the panel", () => {
      const { store, presenter } = setup()
      presenter.setOpen(true)

      presenter.setOpen(false)

      expect(store.open).toBe(false)
    })
  })
})
