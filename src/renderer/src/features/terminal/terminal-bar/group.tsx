import { Chip } from "./chip"
import type { TerminalChip } from "./terminal-bar"

export type GroupProps = {
  members: TerminalChip[]
  renamingId: string | null
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
}

export function Group({
  members,
  renamingId,
  renameDraft,
  onSelect,
  onClose,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
}: GroupProps) {
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
