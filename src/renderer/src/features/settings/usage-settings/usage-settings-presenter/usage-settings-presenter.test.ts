import { describe, expect, it, vi } from "vitest"
import type { UsageStats } from "@shared/types"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"
import { UsageSettingsPresenter } from "./usage-settings-presenter"
import { UsageSettingsStore } from "@/features/settings/usage-settings/usage-settings-store/usage-settings-store"

const stats: UsageStats = {
  days: [{ day: "2026-10-08", tokens: 5_000, cost: 0.4 }],
  cumulative: [{ day: "2026-10-08", cost: 0.4 }],
  totalTokens: 5_000,
  totalCost: 0.4,
  totalTurns: 2,
  models: [{ model: "gpt-test", provider: "openrouter", input: 100, output: 50, cacheRead: 10, cacheWrite: 20, cost: 0.4, turns: 2 }],
  importing: true,
}

function setup() {
  const api = createMockInstance<API>(["usageStats"])
  const store = new UsageSettingsStore()
  const presenter = new UsageSettingsPresenter(store, api, nullLog())
  return { api, store, presenter }
}

describe("UsageSettingsPresenter", () => {
  describe("start", () => {
    it("can load the usage stats", async () => {
      const { api, store, presenter } = setup()
      api.usageStats.mockResolvedValue(stats)

      presenter.start()
      await vi.waitFor(() => expect(store.stats).toEqual(stats))
    })

    it("can keep the old stats when the load fails", async () => {
      const { api, store, presenter } = setup()
      store.setStats(stats)
      api.usageStats.mockRejectedValue(new Error("offline"))

      presenter.start()
      await vi.waitFor(() => expect(api.usageStats).toHaveBeenCalledOnce())

      expect(store.stats).toEqual(stats)
    })

    it("can load again on every start", async () => {
      const { api, presenter } = setup()
      api.usageStats.mockResolvedValue(stats)

      presenter.start()
      presenter.start()
      await vi.waitFor(() => expect(api.usageStats).toHaveBeenCalledTimes(2))
    })
  })

  describe("handleMetric", () => {
    it("can toggle the heatmap metric", () => {
      const { store, presenter } = setup()

      presenter.handleMetric()
      expect(store.metric).toBe("dollars")
    })
  })

  describe("handleSort", () => {
    it("can sort the model table", () => {
      const { store, presenter } = setup()

      presenter.handleSort("input")
      expect(store.sort).toEqual({ key: "input", dir: "desc" })
    })
  })
})