import type { ProjectStatus } from "@/lib/projects"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type ProjectMenuItem = {
  id: string
  name: string
  status: ProjectStatus
}

export type ProjectMenuProps = {
  // The open project's name, or "Choose folder" when none is open.
  label: string
  // The open project's folder, shown as the tooltip.
  path: string | undefined
  projects: ProjectMenuItem[]
  onOpenProject: (projectId: string) => void
  onChooseFolder: () => void
}

const DOT_CLASSES: Record<ProjectStatus, string> = {
  idle: "bg-foreground/15",
  running: "animate-pulse bg-foreground/60",
  done: "bg-success",
}

const DOT_LABELS: Record<ProjectStatus, string | undefined> = {
  idle: undefined,
  running: "Working",
  done: "Finished",
}

// The project name in the header. It opens a list of projects and a way to choose a new folder.
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

function StatusDot({ status }: { status: ProjectStatus }) {
  const label = DOT_LABELS[status]
  return (
    <span
      className={cn("mx-0.75 size-1.5 shrink-0 rounded-full", DOT_CLASSES[status])}
      title={label}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  )
}
