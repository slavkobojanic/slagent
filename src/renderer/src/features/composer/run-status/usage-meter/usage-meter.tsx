import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const RADIUS = 6
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// The ring's colour per level. Each is a full class string, so Tailwind generates every one.
const TONE_CLASS: Record<UsageMeterModel["level"], string> = {
  normal: "text-white/50",
  warning: "text-warning",
  critical: "text-destructive",
}

export type UsageMeterModel = {
  ringPercent: number
  level: "normal" | "warning" | "critical"
  percentText: string
  costText: string | null
  ariaLabel: string
  contextText: string
  thisChatText: string
  tokensText: string
  allChatsText: string | null
  canCompact: boolean
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
    <div className="mb-2 flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn("flex h-7 items-center gap-1.5 rounded-md px-2 text-xs tabular-nums hover:bg-white/10", TONE_CLASS[usage.level])}
            aria-label={usage.ariaLabel}
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
                strokeDashoffset={CIRCUMFERENCE * (1 - usage.ringPercent / 100)}
              />
            </svg>
            {usage.percentText}
            {usage.costText !== null ? <span className="text-white/40">· {usage.costText}</span> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-2 font-normal">
            <p className="text-sm">{usage.contextText}</p>
            <div className="space-y-0.5 text-xs text-white/50 tabular-nums">
              <p className="text-white/80">{usage.thisChatText}</p>
              <p>{usage.tokensText}</p>
              {usage.allChatsText !== null ? <p className="pt-1 text-white/80">{usage.allChatsText}</p> : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!usage.canCompact} onSelect={onCompact}>
            Summarize earlier messages
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error !== null ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
