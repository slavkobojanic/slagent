import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ProjectStatus } from "@/lib/projects"
import { StatusDot } from "./status-dot/status-dot"

export type ProjectMenuItem = {
  id: string
  name: string
  status: ProjectStatus
}

export type ProjectMenuProps = {
  label: string
  // The open project's folder, shown as the tooltip.
  path: string | undefined
  projects: ProjectMenuItem[]
  onOpenProject: (projectId: string) => void
  onChooseFolder: () => void
}

export function ProjectMenu({ label, path, projects, onOpenProject, onChooseFolder }: ProjectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="no-drag max-w-52 truncate text-sm text-foreground/80 hover:text-foreground" title={path}>
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 w-72">
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => onOpenProject(project.id)}>
            <span className="truncate">{project.name}</span>
            <span className="ml-auto">
              <StatusDot status={project.status} />
            </span>
          </DropdownMenuItem>
        ))}
        {projects.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onSelect={onChooseFolder}>Choose folder</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
