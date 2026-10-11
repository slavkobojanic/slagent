import type { ReactNode } from "react"
import { Plus, SquareTerminal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { JoinedChips } from "./joined-chips"

export type TerminalChip = {
  id: string
  title: string
  active: boolean
  exited: boolean
  origin: "user" | "task"
  color: string | null
  groupId: string | null
}

export type TerminalBarProps = {
  chips: TerminalChip[]
  open: boolean
  canCreate: boolean
  renamingId: string | null
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onCreate: () => void
  onToggle: () => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
  branch?: ReactNode
}

export function TerminalBar({
  chips,
  open,
  canCreate,
  renamingId,
  renameDraft,
  onSelect,
  onClose,
  onCreate,
  onToggle,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
  branch,
}: TerminalBarProps) {
  return (
    <footer aria-label="Terminals" className="flex h-10 shrink-0 items-center gap-2 border-t border-white/10 bg-background px-3 text-xs">
      <div className="terminal-tabs flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {chips.length === 0 ? (
          <span className="shrink-0 text-white/30">No terminals</span>
        ) : (
          <JoinedChips
            chips={chips}
            renamingId={renamingId}
            renameDraft={renameDraft}
            onSelect={onSelect}
            onClose={onClose}
            onRenameDraftChange={onRenameDraftChange}
            onRenameSave={onRenameSave}
            onRenameCancel={onRenameCancel}
          />
        )}
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
