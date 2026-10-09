import { Plus, SquareTerminal, X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TerminalChip = {
  id: string
  title: string
  active: boolean
  exited: boolean
  running: boolean
  origin: "user" | "task"
  color: string | null
}

export type TerminalBarProps = {
  chips: TerminalChip[]
  open: boolean
  canCreate: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onCreate: () => void
  onToggle: () => void
}

// The app-wide terminal tab bar: every shell the user opened and every shell
// an agent's task owns, in one list. Selecting a chip shows it in the drawer.
export function TerminalBar({ chips, open, canCreate, onSelect, onClose, onCreate, onToggle }: TerminalBarProps) {
  return (
    <footer aria-label="Terminals" className="flex h-8 shrink-0 items-center gap-2 border-t border-white/10 bg-background px-3 text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {chips.length === 0 ? <span className="shrink-0 text-white/30">No terminals</span> : chips.map((chip) => (
          <Chip key={chip.id} chip={chip} onSelect={onSelect} onClose={onClose} />
        ))}
      </div>
      <button
        type="button"
        aria-label="New terminal tab"
        title="New terminal tab"
        disabled={!canCreate}
        className="shrink-0 rounded p-1 text-white/60 hover:text-white disabled:opacity-40"
        onClick={onCreate}
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={open ? "Hide terminal" : "Show terminal"}
        title={open ? "Hide terminal" : "Show terminal"}
        aria-pressed={open}
        className={cn("shrink-0 rounded p-1 hover:text-white", open ? "bg-white/10 text-white" : "text-white/60")}
        onClick={onToggle}
      >
        {open ? <X className="size-3.5" /> : <SquareTerminal className="size-3.5" />}
      </button>
    </footer>
  )
}

function Chip({ chip, onSelect, onClose }: { chip: TerminalChip; onSelect: (id: string) => void; onClose: (id: string) => void }) {
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded text-xs font-mono",
        chip.active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
      )}
      style={chip.color === null || !chip.active ? undefined : { boxShadow: `inset 0 -2px 0 0 ${chip.color}` }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={chip.active}
        title={chip.exited ? `${chip.title} (exited)` : chip.title}
        className="flex max-w-40 items-center gap-1.5 truncate py-1 pr-1 pl-2"
        onClick={() => onSelect(chip.id)}
      >
        <Dot chip={chip} />
        <span className="truncate">{chip.title}</span>
      </button>
      <button
        type="button"
        aria-label={`Close ${chip.title}`}
        className="mr-1 rounded p-0.5"
        onClick={() => onClose(chip.id)}
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function Dot({ chip }: { chip: TerminalChip }): ReactNode {
  if (chip.exited) {
    return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground/40" />
  }
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", chip.running && "animate-pulse")}
      style={{ backgroundColor: chip.color ?? "rgba(255,255,255,0.6)" }}
    />
  )
}
