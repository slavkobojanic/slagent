import type { API } from "@/ipc/api"
import { describe, expect, it } from "vitest"
import { nullLog } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"
import { PlanCardPresenter } from "./plan-card-presenter"

function setup() {
  const panelStore = new PanelStore()
  const runStore = new RunStore()
  const presenter = new PlanCardPresenter(
    new PlanCardStore(),
    runStore,
    new PanelPresenter(panelStore, createMockInstance<API>([]), nullLog()),
    createMockInstance<API>([]),
    nullLog(),
  )
  return { panelStore, runStore, presenter }
}

describe("PlanCardPresenter", () => {
  describe("start", () => {
    it("can open the plan in the right panel when a plan arrives", () => {
      const { panelStore, runStore, presenter } = setup()
      presenter.start()

      runStore.planProposal = "## Goal\nFix it"

      expect(panelStore.tab).toBe("plan")
      expect(panelStore.open).toBe(true)
      presenter.stop()
    })

    it("can leave the panel alone while the plan clears", () => {
      const { panelStore, runStore, presenter } = setup()
      presenter.start()

      runStore.planProposal = "## Goal\nFix it"
      runStore.planProposal = null

      expect(panelStore.tab).toBe("plan")
      expect(panelStore.open).toBe(true)
      presenter.stop()
    })

    it("can ignore a second start and a stop without listeners", () => {
      const { panelStore, runStore, presenter } = setup()
      presenter.start()
      presenter.start()
      presenter.stop()
      presenter.stop()

      runStore.planProposal = "plan"

      expect(panelStore.open).toBe(false)
    })
  })
})