import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCost, formatTokens } from "@/lib/format"
import { HEAT_LEVEL_CLASSES, HEAT_WEEKS, type HeatCell } from "./usage-grid"

export type UsageHeatmapProps = {
  cells: HeatCell[]
  metric: "tokens" | "dollars"
}

// Hand-rolled GitHub-style grid: 53 columns of 7 rows, column-wise flow.
// Columns share the full width; cells stay square at whatever size that gives.
export function UsageHeatmap({ cells, metric }: UsageHeatmapProps) {
  return (
    <TooltipProvider>
      <div
        aria-label="Daily usage, last 365 days"
        className="grid w-full grid-flow-col grid-rows-7 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${HEAT_WEEKS}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <Tooltip key={cell.day}>
            <TooltipTrigger asChild>
              <span
                className={`aspect-square w-full rounded-xs ${HEAT_LEVEL_CLASSES[cell.level]}`}
                role="img"
                aria-label={cellLabel(cell, metric)}
              />
            </TooltipTrigger>
            <TooltipContent>{cellLabel(cell, metric)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}

function cellLabel(cell: HeatCell, metric: "tokens" | "dollars"): string {
  if (cell.value <= 0) return `${cell.day}: no usage`
  const amount = metric === "tokens" ? `${formatTokens(cell.value)} tokens` : formatCost(cell.value)
  return `${cell.day}: ${amount}`
}