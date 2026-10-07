import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { createMockInstance } from "@/test/create-mock-instance"
import { PlanOverlayPresenter } from "./plan-overlay-presenter"
import { PlanOverlayStore } from "@/features/transcript/plan-overlay/plan-overlay-store/plan-overlay-store"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function setup() {
  const panelStore = new PanelStore()
  const runStore = new RunStore()
  const store = new PlanOverlayStore()
  const composerPort = new ComposerPort()
  vi.spyOn(composerPort, "focus")
  const api = createMockInstance<API>(["approvePlan", "setPlanMode"])
  const presenter = new PlanOverlayPresenter(store, runStore, new PanelPresenter(panelStore, createMockInstance<API>([]), nullLog()), composerPort, api, nullLog())
  return { panelStore, runStore, store, composerPort, api, presenter }
}

describe("PlanOverlayPresenter", () => {
  let parts: ReturnType<typeof setup>

  beforeEach(() => {
    parts = setup()
  })

  afterEach(() => {
    parts.presenter.stop()
    vi.clearAllMocks()
  })

  describe("start", () => {
    it("can open the plan in the right panel when a plan arrives", () => {
      const { panelStore, runStore, presenter } = parts
      presenter.start()

      runStore.planProposal = "## Goal\nFix it"

      expect(panelStore.tab).toBe("plan")
      expect(panelStore.open).toBe(true)
    })

    it("can reset the overlay for every new proposal and ignore a cleared one", () => {
      const { store, runStore, presenter } = parts
      presenter.start()

      runStore.planProposal = "first"
      store.dismiss()
      runStore.planProposal = "second"
      expect(store.dismissed).toBe(false)

      runStore.planProposal = null
      expect(store.approving).toBe(false)
    })

    it("can ignore a second start and a stop without listeners", () => {
      const { panelStore, runStore, presenter } = parts
      presenter.start()
      presenter.start()
      presenter.stop()
      presenter.stop()

      runStore.planProposal = "plan"

      expect(panelStore.open).toBe(false)
    })
  })

  describe("accept", () => {
    it("can approve the plan", async () => {
      const { api, presenter } = parts

      await presenter.accept()

      expect(api.approvePlan).toHaveBeenCalledTimes(1)
    })

    it("can leave the overlay alone when the approval throws", async () => {
      const { api, store, presenter } = parts
      api.approvePlan.mockRejectedValue(new Error("no"))

      await presenter.accept()

      expect(store.approving).toBe(false)
      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe("revise", () => {
    it("can dismiss the overlay and focus the composer", () => {
      const { store, composerPort, presenter } = parts

      presenter.revise()

      expect(store.dismissed).toBe(true)
      expect(composerPort.focus).toHaveBeenCalledTimes(1)
    })
  })

  describe("cancel", () => {
    it("can leave plan mode", async () => {
      const { api, presenter } = parts

      await presenter.cancel()

      expect(api.setPlanMode).toHaveBeenCalledWith(false)
    })

    it("can toast when leaving plan mode throws", async () => {
      const { api, presenter } = parts
      api.setPlanMode.mockImplementation(() => {
        throw new Error("no")
      })

      await presenter.cancel()

      expect(toast.error).toHaveBeenCalled()
    })
  })
})