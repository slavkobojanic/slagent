import { GitBranchIcon } from "lucide-react"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"

// Ellipsize long branch names at this width; the full name lives in the hover popover.
const MAX_LABEL_LENGTH = 20

export type BranchLineProps = {
  label: string
}

export function BranchLine({ label }: BranchLineProps) {
  const shown = label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}\u2026` : label

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className="flex shrink-0 cursor-default items-center gap-1 text-white/40 hover:text-white/80"
          title="Current branch"
        >
          <GitBranchIcon className="size-3" aria-hidden />
          <span className="font-mono">{shown}</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="end" className="w-auto max-w-80 px-3 py-2 text-xs font-mono">
        {label}
      </HoverCardContent>
    </HoverCard>
  )
}
