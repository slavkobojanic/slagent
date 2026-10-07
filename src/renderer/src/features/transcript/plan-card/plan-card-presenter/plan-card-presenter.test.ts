import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { PlanCardPresenter } from "@/features/transcript/plan-card/plan-card-presenter/plan-card-presenter"
import { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { nullLog } from "@/log/log"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

function setup() {
  const store = new PlanCardStore()
  const api = createMockInstance<API>(["approvePlan"])
  const presenter = new PlanCardPresenter(store, api, nullLog())
  return { store, api, presenter }
}

afterEach(() => {
  vi.mocked(toast.error).mockClear()
})

describe("PlanCardPresenter", () => {
  describe("approvePlan", () => {
    it("can approve the plan and clear the approval when it finishes", async () => {
      const { store, api, presenter } = setup()
      let finish: () => void = () => undefined
      api.approvePlan.mockReturnValue(new Promise<void>((resolve) => (finish = () => resolve())))

      const pending = presenter.approvePlan()
      expect(store.approving).toBe(true)
      finish()
      await pending

      expect(api.approvePlan).toHaveBeenCalledTimes(1)
      expect(store.approving).toBe(false)
    })

    it("can report the error and clear the approval when it fails", async () => {
      const { store, api, presenter } = setup()
      api.approvePlan.mockRejectedValue(new Error("Run is still going"))

      await presenter.approvePlan()

      expect(toast.error).toHaveBeenCalledWith("Run is still going")
      expect(store.approving).toBe(false)
    })
  })
})
