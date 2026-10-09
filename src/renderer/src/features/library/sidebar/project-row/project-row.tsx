import { ChevronRightIcon, PinIcon, SquarePenIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ProjectSummary } from "@shared/types"
import { Button } from "@/components/ui/button"
import { projectColor, projectIcon } from "@/components/project-appearance"
import { contrastText } from "@/lib/color"
import { NO_PROJECT_ID } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import { cn } from "@/lib/utils"

export type ProjectRowProps = {
  project: ProjectSummary
  // The open project's row is bold. Every row is a toggle for its chat list.
  active: boolean
  collapsed: boolean
  modKey: string
  onSelect: (project: ProjectSummary) => void
  onNewChat: (project: ProjectSummary) => void
  // Absent for the fake "No project" row, which has nothing to pin or remove.
  menu?: ReactNode
}

export function ProjectRow({ project, active, collapsed, modKey, onSelect, onNewChat, menu }: ProjectRowProps) {
  const Icon = projectIcon(project.icon)
  const color = projectColor(project)
  return (
    <div className="group flex w-full min-w-0 items-center overflow-hidden rounded-md">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
        aria-expanded={!collapsed}
        onClick={() => onSelect(project)}
      >
        <ChevronRightIcon className={cn("size-3 shrink-0 text-foreground/40 transition-transform duration-150", !collapsed && "rotate-90")} />
        {Icon === null ? null : (
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border"
            style={color === null ? undefined : { backgroundColor: color, borderColor: color }}
          >
            <Icon className="size-3" style={color === null ? undefined : { color: contrastText(color) }} />
          </span>
        )}
        <span className={cn("truncate", active ? "font-medium" : "text-foreground/80")}>{project.name}</span>
        {project.pinned ? <PinIcon className="size-3 shrink-0 text-foreground/40" /> : null}
      </button>
      {menu ?? null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-foreground/50 hover:text-foreground"
        title={project.id === NO_PROJECT_ID ? "New chat" : `New chat in ${project.name}${active ? ` (${modKey}N)` : ""}`}
        aria-label={project.id === NO_PROJECT_ID ? "New chat" : `New chat in ${project.name}`}
        onClick={() => onNewChat(project)}
      >
        <SquarePenIcon className="size-3.5" />
      </Button>
    </div>
  )
}
