import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeFile, makeMeta } from "@/features/changes/changes-fixtures"
import { ChangesPresenter } from "./changes-presenter"
import { ChangesStore } from "@/features/changes/changes-store/changes-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { API } from "@/ipc/api"
import { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"

function setup() {
  const panel = new PanelStore()
  const meta = new MetaStore()
  const store = new ChangesStore(panel, new RunStore(), meta)
  const panelPresenter = new PanelPresenter(panel, createMockInstance<API>([]))
  vi.spyOn(panelPresenter, "selectTab")
  vi.spyOn(panelPresenter, "setOpen")
  const layout = new LayoutPresenter(new LayoutStore(), window)
  vi.spyOn(layout, "handleResizeStart").mockImplementation(() => undefined)
  vi.spyOn(layout, "handleResizeReset").mockImplementation(() => undefined)
  const commands = new CommandRegistry()
  const presenter = new ChangesPresenter(store, panel, panelPresenter, layout, commands)
  return { panel, meta, panelPresenter, layout, commands, presenter }
}

describe("ChangesPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
  })

  describe("start", () => {
    it("can register the changes command with the Cmd+Shift+D shortcut", () => {
      const { commands, presenter } = parts

      presenter.start()

      const command = commands.commands.find((item) => item.id === "changes.toggle")
      expect(command?.shortcut).toEqual({ key: "d", mod: true, shift: true })
      expect(command?.group).toBe("Actions")
    })

    it("can register the command once when started twice", () => {
      const { commands, presenter } = parts

      presenter.start()
      presenter.start()

      expect(commands.commands.filter((item) => item.id === "changes.toggle")).toHaveLength(1)
    })
  })

  describe("stop", () => {
    it("can remove the changes command", () => {
      const { commands, presenter } = parts
      presenter.start()

      presenter.stop()

      expect(commands.commands.some((item) => item.id === "changes.toggle")).toBe(false)
    })
  })

  describe("the changes command", () => {
    it("can hide the panel when it is open on the changes tab", () => {
      const { meta, panel, panelPresenter, commands, presenter } = parts
      meta.setMeta(makeMeta("/work/app"))
      presenter.start()
      panel.setOpen(true)

      commands.run("changes.toggle")

      expect(panelPresenter.setOpen).toHaveBeenCalledWith(false)
      expect(panelPresenter.selectTab).not.toHaveBeenCalled()
    })

    it("can show the changes tab and open the panel when the panel is closed", () => {
      const { meta, panelPresenter, commands, presenter } = parts
      meta.setMeta(makeMeta("/work/app"))
      presenter.start()

      commands.run("changes.toggle")

      expect(panelPresenter.selectTab).toHaveBeenCalledWith("changes")
      expect(panelPresenter.setOpen).toHaveBeenCalledWith(true)
    })

    it("can switch to the changes tab when the panel is open on another tab", () => {
      const { meta, panel, panelPresenter, commands, presenter } = parts
      meta.setMeta(makeMeta("/work/app"))
      presenter.start()
      panel.setViewedFile(makeFile())
      panel.setTab("file")
      panel.setOpen(true)

      commands.run("changes.toggle")

      expect(panelPresenter.selectTab).toHaveBeenCalledWith("changes")
      expect(panelPresenter.setOpen).toHaveBeenCalledWith(true)
    })

    it("can do nothing when no folder is open", () => {
      const { panelPresenter, commands, presenter } = parts
      presenter.start()

      commands.run("changes.toggle")

      expect(panelPresenter.setOpen).not.toHaveBeenCalled()
      expect(panelPresenter.selectTab).not.toHaveBeenCalled()
    })
  })

  describe("handleTab", () => {
    it("can select the tab the user clicked", () => {
      const { panelPresenter, presenter } = parts

      presenter.handleTab("plan")

      expect(panelPresenter.selectTab).toHaveBeenCalledWith("plan")
    })
  })

  describe("handleClose", () => {
    it("can close the panel", () => {
      const { panelPresenter, presenter } = parts

      presenter.handleClose()

      expect(panelPresenter.setOpen).toHaveBeenCalledWith(false)
    })
  })

  describe("handleCloseFile", () => {
    it("can forget the open file and go back to the changes tab without closing the panel", () => {
      const { panel, panelPresenter, presenter } = parts
      panel.setViewedFile(makeFile())
      panel.setTab("file")
      panel.setOpen(true)

      presenter.handleCloseFile()

      expect(panel.viewedFile).toBeNull()
      expect(panelPresenter.selectTab).toHaveBeenCalledWith("changes")
      expect(panelPresenter.setOpen).not.toHaveBeenCalled()
    })
  })

  describe("handleResizeStart", () => {
    it("can start a drag on the diff edge with the pointer event", () => {
      const { layout, presenter } = parts
      const event = new MouseEvent("pointerdown", { button: 0, clientX: 400 })

      presenter.handleResizeStart(event)

      expect(layout.handleResizeStart).toHaveBeenCalledWith("diff", event)
    })
  })

  describe("handleResizeReset", () => {
    it("can put the panel back at its default width", () => {
      const { layout, presenter } = parts

      presenter.handleResizeReset()

      expect(layout.handleResizeReset).toHaveBeenCalledWith("diff")
    })
  })
})
