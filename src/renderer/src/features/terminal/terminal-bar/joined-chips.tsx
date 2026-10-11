import type { ReactNode } from "react"
import { Chip } from "./chip"
import { Group } from "./group"
import type { TerminalChip } from "./terminal-bar"

export type JoinedChipsProps = {
  chips: TerminalChip[]
  renamingId: string | null
  renameDraft: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onRenameDraftChange: (value: string) => void
  onRenameSave: (id: string) => void
  onRenameCancel: () => void
}

export function JoinedChips({
  chips,
  renamingId,
  renameDraft,
  onSelect,
  onClose,
  onRenameDraftChange,
  onRenameSave,
  onRenameCancel,
}: JoinedChipsProps) {
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
      <Group
        key={groupId}
        members={members}
        renamingId={renamingId}
        renameDraft={renameDraft}
        onSelect={onSelect}
        onClose={onClose}
        onRenameDraftChange={onRenameDraftChange}
        onRenameSave={onRenameSave}
        onRenameCancel={onRenameCancel}
      />,
    )
  }
  return items
}
