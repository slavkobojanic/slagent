import { Plus, SquareTerminal, X } from "lucide-react"
import type { ReactNode } from "react"
import { contrastText, NEUTRAL_ACCENT } from "@/lib/color"
import { cn } from "@/lib/utils"
export type TerminalChip = {
  id: string
  title: string
  active: boolean
  exited: boolean
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
  branch?: ReactNode
}

// The app-wide terminal tab bar: every shell the user opened and every shell
// an agent's task owns, in one list. Selecting a chip shows it in the drawer.
export function TerminalBar({ chips, open, canCreate, onSelect, onClose, onCreate, onToggle, branch }: TerminalBarProps) {
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
      {branch}
    </footer>
  )
}

function Chip({ chip, onSelect, onClose }: { chip: TerminalChip; onSelect: (id: string) => void; onClose: (id: string) => void }) {
  // The active chip takes its project colour whole, or a plain grey when the
  // shell belongs to no project; the text contrast is picked for either.
  const accent = chip.active ? chip.color ?? NEUTRAL_ACCENT : null
  const text = accent === null ? undefined : contrastText(accent)
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center rounded text-xs font-mono",
        !chip.active ? "text-white/60 hover:text-white" : null,
        chip.exited && !chip.active ? "opacity-50" : null,
      )}
      style={
        accent === null
          ? undefined
          : {
              backgroundColor: accent,
              color: text,
            }
      }
    >
      <button
        type="button"
        role="tab"
        aria-selected={chip.active}
        title={chip.exited ? `${chip.title} (exited)` : chip.title}
        className="flex max-w-40 items-center truncate py-1 pr-1 pl-2"
        onClick={() => onSelect(chip.id)}
      >
        <span className="truncate">{ellipsize(chip.title, 20)}</span>
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

// The bar shows the shape of the command at a glance; the tooltip has the whole thing.
function ellipsize(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max - 1)}\u2026`
}
