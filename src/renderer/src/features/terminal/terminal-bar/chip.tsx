import { X } from "lucide-react"
import { contrastText, NEUTRAL_ACCENT } from "@/lib/color"
import { cn } from "@/lib/utils"
import { ChipRename } from "./chip-rename"
import type { TerminalChip } from "./terminal-bar"

export type ChipProps = {
  chip: TerminalChip
  joined: boolean
  separated?: boolean
  renaming: boolean
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
}

export function Chip({
  chip,
  joined,
  separated = false,
  renaming,
  renameDraft,
  onSelect,
  onClose,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
}: ChipProps) {
  if (renaming) {
    return (
      <ChipRename
        id={chip.id}
        draft={renameDraft}
        onDraftChange={onRenameDraftChange}
        onSave={onRenameSave}
        onCancel={onRenameCancel}
      />
    )
  }
  const accent = chip.active ? chip.color ?? NEUTRAL_ACCENT : null
  const wash = !chip.active && chip.color !== null ? `color-mix(in srgb, ${chip.color} 20%, transparent)` : null
  const text = accent === null ? undefined : contrastText(accent)
  return (
    <div
      className={cn(
        "group flex shrink-0 items-center text-xs font-mono",
        joined ? "min-w-0" : "rounded",
        separated ? "border-l border-white/10" : null,
        !chip.active ? "text-white/60 hover:text-white" : null,
        chip.exited && !chip.active ? "opacity-50" : null,
      )}
      style={
        accent !== null
          ? { backgroundColor: accent, color: text }
          : wash !== null
            ? { backgroundColor: wash }
            : undefined
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

function ellipsize(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max - 1)}…`
}
