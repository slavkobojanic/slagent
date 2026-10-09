import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type TerminalTabProps = {
  title: string
  active: boolean
  exited: boolean
  // "task" tabs were created for the agent, so the status bar can find them again.
  origin: "user" | "task"
  // The owning project's accent colour, or null for the app default.
  color: string | null
  onSelect: () => void
  onClose: () => void
}

export function TerminalTab({ title, active, exited, origin, color, onSelect, onClose }: TerminalTabProps) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded-md text-xs",
        active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
      )}
      style={color === null || !active ? undefined : { boxShadow: `inset 0 -2px 0 0 ${color}` }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        title={exited ? `${title} (exited)` : title}
        className="flex max-w-40 items-center gap-1.5 truncate py-1 pr-1 pl-2"
        onClick={onSelect}
      >
        {exited ? (
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground/40" />
        ) : origin === "task" ? (
          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? "rgba(255,255,255,0.4)" }} />
        ) : null}
        <span className="truncate">{title}</span>
      </button>
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="mr-0.5 rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={onClose}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}
