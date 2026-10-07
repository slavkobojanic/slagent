import type { ProjectSummary } from "@shared/types"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { RowMenu } from "@/features/library/sidebar/row-menu/row-menu"

export type ProjectRowMenuProps = {
  project: ProjectSummary
  onPin: (project: ProjectSummary) => void
  onRemove: (project: ProjectSummary) => void
}

export function ProjectRowMenu({ project, onPin, onRemove }: ProjectRowMenuProps) {
  return (
    <RowMenu label={`${project.name} actions`}>
      <DropdownMenuItem onSelect={() => onPin(project)}>{project.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onSelect={() => onRemove(project)}>
        Remove project
      </DropdownMenuItem>
    </RowMenu>
  )
}
