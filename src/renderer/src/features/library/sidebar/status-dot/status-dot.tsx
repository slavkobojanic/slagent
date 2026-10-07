import type { ChatStatus } from "@shared/types"
import { cn } from "@/lib/utils"

const LABELS: Partial<Record<ChatStatus, string>> = {
  running: "Working",
  waiting: "Needs your input",
  done: "Finished",
  error: "Stopped with an error",
}

const CLASSES: Partial<Record<ChatStatus, string>> = {
  idle: "bg-foreground/15",
  running: "animate-pulse bg-foreground/60",
  // Done is gray: green for finished is unnecessary.
  done: "bg-foreground/15",
  // Lighter than the palette colour so the dot does not shout.
  waiting: "bg-info/50",
  error: "bg-destructive/50",
}

// Idle has no label, so it is not announced.
export function StatusDot({ status }: { status: ChatStatus }) {
  const className = CLASSES[status]
  if (!className) return null
  const label = LABELS[status]
  return (
    <span
      className={cn("mx-0.75 size-1.5 shrink-0 rounded-full", className)}
      title={label}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  )
}
