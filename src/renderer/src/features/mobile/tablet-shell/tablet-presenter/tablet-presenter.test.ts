import { describe, expect, it } from "vitest"
import type { API } from "@/ipc/api"
import { TabletPresenter } from "@/features/mobile/tablet-shell/tablet-presenter/tablet-presenter"
import { nullLog } from "@/log/log"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"

function setup() {
  const panelStore = new PanelStore()
  const api = createMockInstance<API>(["readFile"])
  const panelPresenter = new PanelPresenter(panelStore, api, nullLog())
  const presenter = new TabletPresenter(panelStore, panelPresenter, nullLog())
  return { panelStore, api, presenter }
}

describe("TabletPresenter", () => {
  describe("activeTab", () => {
    it("can show the chat while the panel is closed", () => {
      const { panelStore, presenter } = setup()
      panelStore.setTab("plan")
      expect(presenter.activeTab).toBe("chat")
    })

    it("can show the panel's tab once it is open", () => {
      const { panelStore, presenter } = setup()
      panelStore.setTab("plan")
      panelStore.setOpen(true)
      expect(presenter.activeTab).toBe("plan")
    })
  })

  describe("selectTab", () => {
    it("can open the panel on a tab", () => {
      const { panelStore, presenter } = setup()
      presenter.selectTab("plan")
      expect(panelStore.open).toBe(true)
      expect(panelStore.tab).toBe("plan")
    })

    it("can return to the chat by closing the panel", () => {
      const { panelStore, presenter } = setup()
      presenter.selectTab("changes")
      presenter.selectTab("chat")
      expect(panelStore.open).toBe(false)
      expect(presenter.activeTab).toBe("chat")
    })
  })

  describe("openFile", () => {
    it("can jump to the source tab", async () => {
      const { panelStore, api, presenter } = setup()
      api.readFile.mockResolvedValue({ path: "a.ts", absolutePath: "/r/a.ts", size: 1 } as never)
      presenter.openFile("a.ts")
      await Promise.resolve()
      await Promise.resolve()
      expect(panelStore.tab).toBe("file")
      expect(panelStore.open).toBe(true)
      expect(presenter.activeTab).toBe("file")
    })
  })

  describe("togglePanel", () => {
    it("can open and close the panel", () => {
      const { panelStore, presenter } = setup()
      presenter.togglePanel()
      expect(panelStore.open).toBe(true)
      presenter.togglePanel()
      expect(panelStore.open).toBe(false)
    })
  })
})
