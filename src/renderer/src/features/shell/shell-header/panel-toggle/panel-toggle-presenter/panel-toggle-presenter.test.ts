import { beforeEach, describe, expect, it } from "vitest"
import type { API } from "@/ipc/api"
import { PanelTogglePresenter } from "@/features/shell/shell-header/panel-toggle/panel-toggle-presenter/panel-toggle-presenter"
import { createMockInstance } from "@/test/create-mock-instance"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"

describe("PanelTogglePresenter", () => {
  let panelStore: PanelStore
  let presenter: PanelTogglePresenter

  beforeEach(() => {
    panelStore = new PanelStore()
    presenter = new PanelTogglePresenter(panelStore, new PanelPresenter(panelStore, createMockInstance<API>([])))
  })

  describe("toggle", () => {
    it("can open the right panel when it is closed", () => {
      panelStore.setOpen(false)

      presenter.toggle()

      expect(panelStore.open).toBe(true)
    })

    it("can close the right panel when it is open", () => {
      panelStore.setOpen(true)

      presenter.toggle()

      expect(panelStore.open).toBe(false)
    })
  })
})
