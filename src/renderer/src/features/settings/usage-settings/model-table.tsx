import type { UsageModelStats } from "@shared/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCost, formatTokens } from "@/lib/format"
import type { UsageSort, UsageSortKey } from "./usage-grid"

export type ModelTableProps = {
  models: UsageModelStats[]
  totalCost: number
  sort: UsageSort
  onSort: (key: "model" | "input" | "output" | "cache" | "cost" | "turns" | "share") => void
}

const SHARE_CLASSES = ["bg-info", "bg-success", "bg-warning", "bg-destructive", "bg-primary", "bg-white/40"] as const

// Lifetime spend per model, sortable, with a stacked spend-share bar above.
export function ModelTable({ models, totalCost, sort, onSort }: ModelTableProps) {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        {totalCost > 0 ? <SpendShareBar models={models} totalCost={totalCost} /> : null}
        <table className="w-full text-left text-xs">
          <thead className="text-white/50">
            <tr>
            <th className="py-1.5 font-medium" aria-sort={sortAttr(sort, "model")}>
              <SortHeader label="Model" active={sort.key === "model"} dir={sort.dir} onSort={() => onSort("model")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "input")}>
              <SortHeader label="In" active={sort.key === "input"} dir={sort.dir} onSort={() => onSort("input")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "output")}>
              <SortHeader label="Out" active={sort.key === "output"} dir={sort.dir} onSort={() => onSort("output")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "cache")}>
              <SortHeader label="Cache" active={sort.key === "cache"} dir={sort.dir} onSort={() => onSort("cache")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "cost")}>
              <SortHeader label="Spend" active={sort.key === "cost"} dir={sort.dir} onSort={() => onSort("cost")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "turns")}>
              <SortHeader label="Turns" active={sort.key === "turns"} dir={sort.dir} onSort={() => onSort("turns")} />
            </th>
            <th className="py-1.5 text-right font-medium" aria-sort={sortAttr(sort, "share")}>
              <SortHeader label="% of spend" active={sort.key === "share"} dir={sort.dir} onSort={() => onSort("share")} />
            </th>
          </tr>
        </thead>
          <tbody>
            {models.map((model) => (
              <tr key={`${model.provider}:${model.model}`} className="border-t border-white/10">
                <td className="w-44 max-w-44 py-1.5 pr-2 font-mono">
                  <ModelName name={model.model} />
                </td>
                <td className="py-1.5 text-right text-white/70">{formatTokens(model.input)}</td>
                <td className="py-1.5 text-right text-white/70">{formatTokens(model.output)}</td>
                <td className="py-1.5 text-right text-white/70">{formatTokens(model.cacheRead + model.cacheWrite)}</td>
                <td className="py-1.5 text-right text-white/70">{formatCost(model.cost)}</td>
                <td className="py-1.5 text-right text-white/70">{model.turns}</td>
                <td className="py-1.5 text-right text-white/70">{shareLabel(model, totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}

// The model column shares the row with seven numbers, so the name is capped
// and the full id opens in a tooltip when it is long enough to truncate.
function ModelName({ name }: { name: string }) {
  const content = <span className="block truncate">{name}</span>
  if (name.length <= 22) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-64 break-all">{name}</TooltipContent>
    </Tooltip>
  )
}

function SpendShareBar({ models, totalCost }: { models: UsageModelStats[]; totalCost: number }) {
  const shares = models.map((model, index) => ({ model, share: model.cost / totalCost, color: SHARE_CLASSES[index % SHARE_CLASSES.length]! }))
  return (
    <div aria-label="Share of spend by model" className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
      {shares.map(({ model, share, color }) => (
        <Tooltip key={model.model}>
          <TooltipTrigger asChild>
            <span className={`${color}`} style={{ width: `${Math.max(share * 100, 1)}%` }} />
          </TooltipTrigger>
          <TooltipContent>
            {model.model} · {percent(share)}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function SortHeader({ label, active, dir, onSort }: { label: string; active: boolean; dir: "asc" | "desc"; onSort: () => void }) {
  return (
    <button type="button" className={active ? "text-white" : "hover:text-white"} onClick={onSort}>
      {label}
      {active ? (dir === "asc" ? " ↑" : " ↓") : null}
    </button>
  )
}

function sortAttr(sort: UsageSort, key: UsageSortKey): "ascending" | "descending" | undefined {
  if (sort.key !== key) return undefined
  return sort.dir === "asc" ? "ascending" : "descending"
}

function shareLabel(model: UsageModelStats, totalCost: number): string {
  if (totalCost <= 0) return "—"
  return percent(model.cost / totalCost)
}

function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`
}