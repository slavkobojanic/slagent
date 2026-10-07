import { beforeEach, describe, expect, it, type Mock } from "vitest"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { ShellPresenter } from "@/features/shell/shell-presenter/shell-presenter"
import { ShellStore } from "@/features/shell/shell-store/shell-store"
import { createMockInstance } from "@/test/create-mock-instance"
import type { PanelPresenter } from "@/state/panel-presenter"
import { OverlayStore } from "@/state/overlay-store"
import { PanelStore } from "@/state/panel-store"

describe("ShellPresenter", () => {
  let store: ShellStore
  let overlay: OverlayStore
  let panel: PanelStore
  let setPanelOpen: Mock
  let library: { openProject: Mock; chooseFolder: Mock }
  let presenter: ShellPresenter

  beforeEach(() => {
    store = new ShellStore()
    overlay = new OverlayStore()
    panel = new PanelStore()
    setPanelOpen = createMockInstance<PanelPresenter>(["setOpen"]).setOpen
    library = createMockInstance<LibraryService>(["openProject", "chooseFolder"])
    library.openProject.mockResolvedValue(undefined)
    library.chooseFolder.mockResolvedValue(undefined)
    presenter = new ShellPresenter(store, overlay, panel, { setOpen: setPanelOpen }, library)
  })

  describe("openProject", () => {
    it("can open the project through the library service", async () => {
      await presenter.openProject("p1")

      expect(library.openProject).toHaveBeenCalledWith("p1")
    })

    it("can record the error when the library cannot open the project", async () => {
      library.openProject.mockRejectedValue(new Error("Project folder is gone"))

      await presenter.openProject("p1")

      expect(store.error).toBe("Project folder is gone")
    })

    it("can clear an earlier error before it tries again", async () => {
      store.setError("Earlier failure")

      await presenter.openProject("p1")

      expect(store.error).toBeNull()
    })
  })

  describe("chooseFolder", () => {
    it("can open the folder picker through the library service", async () => {
      await presenter.chooseFolder()

      expect(library.chooseFolder).toHaveBeenCalledTimes(1)
    })

    it("can record the error when the folder picker fails", async () => {
      library.chooseFolder.mockRejectedValue(new Error("Picker unavailable"))

      await presenter.chooseFolder()

      expect(store.error).toBe("Picker unavailable")
    })
  })

  describe("togglePanel", () => {
    it("can open the right panel when it is closed", () => {
      panel.setOpen(false)

      presenter.togglePanel()

      expect(setPanelOpen).toHaveBeenCalledWith(true)
    })

    it("can close the right panel when it is open", () => {
      panel.setOpen(true)

      presenter.togglePanel()

      expect(setPanelOpen).toHaveBeenCalledWith(false)
    })
  })

  describe("openModel", () => {
    it("can open the model dialog", () => {
      presenter.openModel()

      expect(overlay.modelOpen).toBe(true)
    })
  })

  describe("openSettings", () => {
    it("can open the settings dialog", () => {
      presenter.openSettings()

      expect(overlay.settingsOpen).toBe(true)
    })
  })
})
