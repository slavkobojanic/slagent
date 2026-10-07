import { toast } from "sonner"
import type { UsageState } from "@shared/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { errorText } from "@/lib/format"

const RADIUS = 6
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function UsageMeter({
  usage,
  busy,
  onCompact,
}: {
  usage: UsageState | null
  busy: boolean
  onCompact: () => Promise<void>
}) {
  if (!usage) return <span className="ml-auto" />
  const percent = usage.percent ?? 0
  let tone = "text-white/50"
  if (percent >= 70) tone = "text-amber-400"
  if (percent >= 90) tone = "text-[#ff5c5c]"
  let contextLabel = "Context not measured yet"
  if (usage.contextTokens !== null) {
    contextLabel = `${formatTokens(usage.contextTokens)} of ${formatTokens(usage.contextWindow)} context`
  }
  let percentLabel = "–"
  if (usage.percent !== null) percentLabel = `${Math.round(usage.percent)}%`

  async function compact() {
    try {
      await onCompact()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`ml-auto flex h-7 items-center gap-1.5 rounded-md px-2 text-xs tabular-nums hover:bg-white/10 ${tone}`}
          aria-label={`${contextLabel}, ${formatCost(usage.cost)} spent`}
        >
          <svg viewBox="0 0 16 16" className="size-3.5 -rotate-90" aria-hidden>
            <circle cx="8" cy="8" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
            <circle
              cx="8"
              cy="8"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(percent, 100) / 100)}
            />
          </svg>
          {percentLabel}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1 font-normal">
          <p className="text-sm">{contextLabel}</p>
          <p className="text-xs text-white/50">
            {formatTokens(usage.totalTokens)} tokens this chat · {formatCost(usage.cost)}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onSelect={() => void compact()}>
          Summarize earlier messages
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`
  return String(tokens)
}

function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.01) return "<$0.01"
  return `$${cost.toFixed(2)}`
}

export { UsageMeter }
