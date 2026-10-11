import type { UsageModelStats } from "@shared/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const SHARE_CLASSES = ["bg-info", "bg-success", "bg-warning", "bg-destructive", "bg-primary", "bg-white/40"] as const

export type SpendShareBarProps = {
  models: UsageModelStats[]
  totalCost: number
}

export function SpendShareBar({ models, totalCost }: SpendShareBarProps) {
  const shares = models.map((model, index) => ({
    model,
    share: model.cost / totalCost,
    color: SHARE_CLASSES[index % SHARE_CLASSES.length]!,
  }))
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

function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`
}
