import type { ChatStatus } from "@shared/types"
import { cn } from "@/lib/utils"

const LABELS: Record<ChatStatus, string> = {
  idle: "",
  running: "Working",
  waiting: "Needs your input",
  done: "Finished",
  error: "Stopped with an error",
}

const CLASSES: Record<ChatStatus, string> = {
  idle: "bg-foreground/15",
  running: "animate-pulse bg-foreground/60",
  waiting: "bg-info",
  done: "bg-success",
  error: "bg-destructive",
}

// The colored dot in front of a chat or project. Idle has no label, so it is not announced.
export function StatusDot({ status }: { status: ChatStatus }) {
  const label = LABELS[status]
  return (
    <span
      className={cn("mx-0.75 size-1.5 shrink-0 rounded-full", CLASSES[status])}
      title={label || undefined}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    />
  )
}
