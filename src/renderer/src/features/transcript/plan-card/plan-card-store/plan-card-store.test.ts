import { describe, expect, it } from "vitest"
import { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"

describe("PlanCardStore", () => {
  describe("setApproving", () => {
    it("can track an approval in flight", () => {
      const store = new PlanCardStore()

      store.setApproving(true)

      expect(store.approving).toBe(true)
    })
  })
})
