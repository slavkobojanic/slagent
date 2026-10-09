import { makeAutoObservable } from "mobx"
import type { UsageModelStats, UsageStats } from "@shared/types"
import { heatCells, type HeatCell, type UsageSort, type UsageSortKey } from "@/features/settings/usage-settings/usage-grid"

// Everything the usage tab shows, plus the two choices the user makes there.
export class UsageSettingsStore {
  stats: UsageStats | null = null
  metric: "tokens" | "dollars" = "tokens"
  sort: UsageSort = { key: "cost", dir: "desc" }

  constructor() {
    makeAutoObservable(this)
  }

  setStats(stats: UsageStats) {
    this.stats = stats
  }

  setMetric(metric: "tokens" | "dollars") {
    this.metric = metric
  }

  toggleMetric() {
    this.metric = this.metric === "tokens" ? "dollars" : "tokens"
  }

  // Clicking a column sorts by it, descending first; clicking it again flips.
  setSort(key: UsageSortKey) {
    if (this.sort.key === key) {
      this.sort = { key, dir: this.sort.dir === "desc" ? "asc" : "desc" }
      return
    }
    this.sort = { key, dir: "desc" }
  }

  // The 371-day heatmap grid for the current metric.
  get cells(): HeatCell[] {
    const days = this.stats?.days ?? []
    return heatCells(days, this.metric)
  }

  get sortedModels(): UsageModelStats[] {
    const models = this.stats?.models ?? []
    const share = (model: UsageModelStats): number => {
      const total = this.stats?.totalCost ?? 0
      return total > 0 ? model.cost / total : 0
    }
    const sorted = [...models]
    const { key, dir } = this.sort
    const flip = dir === "asc" ? 1 : -1
    sorted.sort((a, b) => {
      if (key === "model") return a.model.localeCompare(b.model) * flip
      if (key === "share") return (share(a) - share(b)) * flip
      const values: Record<Exclude<UsageSortKey, "model" | "share">, (model: UsageModelStats) => number> = {
        input: (model) => model.input,
        output: (model) => model.output,
        cache: (model) => model.cacheRead + model.cacheWrite,
        cost: (model) => model.cost,
      }
      return (values[key](a) - values[key](b)) * flip
    })
    return sorted
  }
}