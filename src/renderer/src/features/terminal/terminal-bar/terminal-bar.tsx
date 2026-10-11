import type { ReactNode } from "react"
import { Plus, SquareTerminal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { contrastText, NEUTRAL_ACCENT } from "@/lib/color"
import { cn } from "@/lib/utils"

export type TerminalChip = {
  id: string
  title: string
  active: boolean
  exited: boolean
  origin: "user" | "task"
  color: string | null
  // Chips sharing a group join into one tab-group element in the bar.
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

// The app-wide terminal tab bar: every shell the user opened and every shell
// an agent's task owns, in one list. Selecting a chip shows it in the drawer.
// Consecutive chips that share a tab group join into one element with linked
// corners, mirroring the split panes in the drawer.
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

// Runs the chips left to right, folding consecutive chips that share a group
// into one joined element. A solo chip keeps its own rounded pill.
function JoinedChips({
  chips,
  renamingId,
  renameDraft,
  onSelect,
  onClose,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
}: {
  chips: TerminalChip[]
  renamingId: string | null
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
}) {
  const items: ReactNode[] = []
  let index = 0
  while (index < chips.length) {
    const chip = chips[index]
    if (chip.groupId === null) {
      items.push(
        <Chip
          key={chip.id}
          chip={chip}
          joined={false}
          renaming={chip.id === renamingId}
          onSelect={onSelect}
          onClose={onClose}
          renameDraft={renameDraft}
          onRenameDraftChange={onRenameDraftChange}
          onRenameSave={onRenameSave}
          onRenameCancel={onRenameCancel}
        />,
      )
      index += 1
      continue
    }
    const members: TerminalChip[] = []
    const groupId = chip.groupId
    while (index < chips.length && chips[index]?.groupId === groupId) {
      const member = chips[index]
      if (member !== undefined) {
        members.push(member)
      }
      index += 1
    }
    items.push(
      <Group key={groupId} members={members} renamingId={renamingId} renameDraft={renameDraft} onSelect={onSelect} onClose={onClose} onRenameDraftChange={onRenameDraftChange} onRenameSave={onRenameSave} onRenameCancel={onRenameCancel} />,
    )
  }
  return items
}

// One tab group: members share a container whose corners are the group's, so
// the split panes read as one unit; a thin line separates the members.
function Group({
  members,
  renamingId,
  renameDraft,
  onSelect,
  onClose,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
}: {
  members: TerminalChip[]
  renamingId: string | null
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
}) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border border-white/10">
      {members.map((member, index) => (
        <Chip
          key={member.id}
          chip={member}
          joined={true}
          separated={index > 0}
          renaming={member.id === renamingId}
          onSelect={onSelect}
          onClose={onClose}
          renameDraft={renameDraft}
          onRenameDraftChange={onRenameDraftChange}
          onRenameSave={onRenameSave}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  )
}

type ChipProps = {
  chip: TerminalChip
  // Inside a group the chip loses its own corners; the group carries them.
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

function Chip({ chip, joined, separated = false, renaming, renameDraft, onSelect, onClose, onRenameDraftChange, onRenameSave, onRenameCancel }: ChipProps) {
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
  // The active chip takes its project colour whole, or a plain grey when the
  // shell belongs to no project; the text contrast is picked for either. An
  // inactive chip wears a much lighter wash of the same colour, so shells from
  // different projects stay tellable apart without stealing the row.
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

// The chip's name, edited in place: Enter or blur commits, Escape reverts.
function ChipRename({
  id,
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: {
  id: string
  draft: string
  onDraftChange: (value: string) => void
  onSave: (id: string) => void
  onCancel: () => void
}) {
  return (
    <form
      className="flex shrink-0 px-1"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(id)
      }}
    >
      <Input
        value={draft}
        autoFocus
        aria-label="Terminal tab name"
        className="h-6 w-40 px-2 py-0 font-mono text-xs"
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={() => onSave(id)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel()
          }
        }}
      />
    </form>
  )
}

// The bar shows the shape of the command at a glance; the tooltip has the whole thing.
function ellipsize(text: string, max: number): string {
  if (text.length <= max) {
    return text
  }
  return `${text.slice(0, max - 1)}\u2026`
}
