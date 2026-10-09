import { describe, expect, it } from "vitest"
import type { UsageStats } from "@shared/types"
import { UsageSettingsStore } from "./usage-settings-store"

const stats: UsageStats = {
  days: [{ day: "2026-10-08", tokens: 5_000, cost: 0.4 }],
  cumulative: [{ day: "2026-10-08", cost: 0.4 }],
  totalTokens: 5_000,
  totalCost: 0.4,
  totalTurns: 2,
  models: [
    { model: "claude-opus-5-5", provider: "anthropic", input: 100, output: 50, cacheRead: 10, cacheWrite: 20, cost: 0.3, turns: 1 },
    { model: "gpt-test", provider: "openrouter", input: 100, output: 50, cacheRead: 10, cacheWrite: 20, cost: 0.1, turns: 1 },
  ],
  importing: false,
}

describe("UsageSettingsStore", () => {
  describe("setStats", () => {
    it("can hold the loaded stats", () => {
      const store = new UsageSettingsStore()

      expect(store.stats).toBeNull()
      store.setStats(stats)
      expect(store.stats).toEqual(stats)
    })
  })

  describe("toggleMetric", () => {
    it("can switch between tokens and dollars", () => {
      const store = new UsageSettingsStore()

      expect(store.metric).toBe("tokens")
      store.toggleMetric()
      expect(store.metric).toBe("dollars")
      store.toggleMetric()
      expect(store.metric).toBe("tokens")
    })
  })

  describe("setSort", () => {
    it("can sort by a new column, descending first", () => {
      const store = new UsageSettingsStore()

      store.setSort("input")
      expect(store.sort).toEqual({ key: "input", dir: "desc" })
    })

    it("can flip the direction of the same column", () => {
      const store = new UsageSettingsStore()

      store.setSort("input")
      store.setSort("input")
      expect(store.sort).toEqual({ key: "input", dir: "asc" })
    })
  })

  describe("sortedModels", () => {
    it("can sort by spend, most expensive first", () => {
      const store = new UsageSettingsStore()
      store.setStats(stats)

      expect(store.sortedModels.map((model) => model.model)).toEqual(["claude-opus-5-5", "gpt-test"])
    })

    it("can sort ascending on the second click of the same column", () => {
      const store = new UsageSettingsStore()
      store.setStats(stats)
      store.setSort("input")
      store.setSort("input")

      expect(store.sort).toEqual({ key: "input", dir: "asc" })
    })

    it("can sort models by name", () => {
      const store = new UsageSettingsStore()
      store.setStats(stats)
      store.setSort("model")

      expect(store.sortedModels.map((model) => model.model)).toEqual(["gpt-test", "claude-opus-5-5"])
    })

    it("can sort by share of spend", () => {
      const store = new UsageSettingsStore()
      store.setStats(stats)
      store.setSort("share")
      store.setSort("share")

      expect(store.sortedModels[0]?.model).toBe("gpt-test")
    })

    it("can sort empty models without rows", () => {
      const store = new UsageSettingsStore()
      store.setSort("input")

      expect(store.sortedModels).toEqual([])
    })
  })

  describe("cells", () => {
    it("can bucket the loaded days for the heatmap", () => {
      const store = new UsageSettingsStore()
      store.setStats(stats)

      expect(store.cells.find((cell) => cell.day === "2026-10-08")?.value).toBe(5_000)
    })

    it("can build the grid before stats arrive", () => {
      const store = new UsageSettingsStore()

      expect(store.cells).toHaveLength(371)
    })
  })
})