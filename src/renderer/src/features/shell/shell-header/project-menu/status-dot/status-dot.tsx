import type { ProjectStatus } from "@/lib/projects"
import { cn } from "@/lib/utils"

const DOT_CLASSES: Record<ProjectStatus, string> = {
  idle: "bg-foreground/15",
  running: "animate-pulse bg-foreground/60",
  done: "bg-success",
}

const DOT_LABELS: Record<ProjectStatus, string | undefined> = {
  idle: undefined,
  running: "Working",
  done: "Finished",
}

export function StatusDot({ status }: { status: ProjectStatus }) {
  const label = DOT_LABELS[status]
  return (
    <span
      className={cn("mx-0.75 size-1.5 shrink-0 rounded-full", DOT_CLASSES[status])}
      title={label}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  )
}
