import type { UsageModelStats, UsageStats } from "@shared/types"
import { formatCost, formatTokens } from "@/lib/format"
import { ModelTable } from "./model-table"
import { SpendChart } from "./spend-chart"
import { UsageHeatmap } from "./usage-heatmap"
import type { HeatCell } from "./usage-grid"
import type { UsageSort } from "./usage-grid"

export type UsageSettingsProps = {
  stats: UsageStats | null
  metric: "tokens" | "dollars"
  cells: HeatCell[]
  sortedModels: UsageModelStats[]
  sort: UsageSort
  onMetric: () => void
  onSort: (key: "model" | "input" | "output" | "cache" | "cost" | "share") => void
}

export function UsageSettings({ stats, metric, cells, sortedModels, sort, onMetric, onSort }: UsageSettingsProps) {
  if (stats === null) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Usage</h2>
        <p className="text-xs text-white/50">Loading…</p>
      </div>
    )
  }
  if (stats.days.length === 0 && stats.models.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Usage</h2>
        {stats.importing ? <ImportingNote /> : null}
        <p className="text-sm text-white/60">No usage recorded yet. New turns are logged from now on.</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Usage</h2>
        <button
          type="button"
          onClick={onMetric}
          className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/15"
          title={metric === "tokens" ? "Colour the heatmap by spend" : "Colour the heatmap by tokens"}
        >
          {metric === "tokens" ? "Tokens" : "Dollars"}
        </button>
      </div>
      {stats.importing ? <ImportingNote /> : null}
      <section className="space-y-2">
        <p className="text-base font-medium text-white">
          {formatTokens(stats.totalTokens)} tokens · {formatCost(stats.totalCost)} across {stats.totalTurns} turns
        </p>
        <UsageHeatmap cells={cells} metric={metric} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Spend</h3>
        <p className="text-xs text-white/50">
          Lifetime total: {formatCost(stats.totalCost)}
        </p>
        <SpendChart points={stats.cumulative} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">By model</h3>
        <ModelTable models={sortedModels} totalCost={stats.totalCost} sort={sort} onSort={onSort} />
      </section>
    </div>
  )
}

function ImportingNote() {
  return (
    <p role="status" className="text-xs text-white/50">
      Importing history from earlier chats…
    </p>
  )
}