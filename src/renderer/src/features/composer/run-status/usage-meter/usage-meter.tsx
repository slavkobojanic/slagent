import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type UsageMeterModel = {
  ringPercent: number
  level: "normal" | "warning" | "critical"
  percentText: string
  costText: string | null
  ariaLabel: string
  contextText: string
  rows: { label: string; value: string }[]
  canCompact: boolean
}

// The trigger's colour per level. Each is a full class string, so Tailwind generates every one.
const TONE_CLASS: Record<UsageMeterModel["level"], string> = {
  normal: "text-white/50",
  warning: "text-warning",
  critical: "text-destructive",
}

// The context bar's fill colour per level. Each is a full class string, so Tailwind generates every one.
const BAR_CLASS: Record<UsageMeterModel["level"], string> = {
  normal: "bg-white/50",
  warning: "bg-warning",
  critical: "bg-destructive",
}

export type UsageMeterProps = {
  usage: UsageMeterModel | null
  error: string | null
  onCompact: () => void
}

export function UsageMeter({ usage, error, onCompact }: UsageMeterProps) {
  if (usage === null) {
    return null
  }
  return (
    // The wrapper lets a compact failure surface above the trigger without disturbing the footer.
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn("flex h-8 items-center gap-1.5 rounded-md px-2 text-xs whitespace-nowrap tabular-nums hover:bg-white/10", TONE_CLASS[usage.level])}
            aria-label={usage.ariaLabel}
          >
            {usage.percentText}
            {usage.costText !== null ? <span className="text-white/40">{usage.costText}</span> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="space-y-2 px-2 py-1.5">
            <p className="text-sm font-medium">{usage.contextText}</p>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full", BAR_CLASS[usage.level])} style={{ width: `${usage.ringPercent}%` }} />
            </div>
            <div className="space-y-1 text-xs tabular-nums">
              {usage.rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-6">
                  <span className="text-white/50">{row.label}</span>
                  <span className="text-white/80">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <DropdownMenuItem disabled={!usage.canCompact} onSelect={onCompact}>
            Summarize earlier messages
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error !== null ? <p role="alert" className="absolute bottom-full right-0 z-10 pb-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
