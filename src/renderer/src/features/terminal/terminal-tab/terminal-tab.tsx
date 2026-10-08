import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type TerminalTabProps = {
  title: string
  active: boolean
  exited: boolean
  onSelect: () => void
  onClose: () => void
}

export function TerminalTab({ title, active, exited, onSelect, onClose }: TerminalTabProps) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded-md text-xs",
        active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        title={exited ? `${title} (exited)` : title}
        className="flex max-w-40 items-center gap-1.5 truncate py-1 pr-1 pl-2"
        onClick={onSelect}
      >
        {exited ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground/40" /> : null}
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
