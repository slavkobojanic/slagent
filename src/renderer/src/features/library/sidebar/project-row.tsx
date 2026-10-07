import { ChevronRightIcon, PinIcon, SquarePenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { RowMenu } from "@/features/library/sidebar/row-menu"
import { StatusDot } from "@/features/library/sidebar/status-dot"
import { cn } from "@/lib/utils"
import type { ChatStatus, ProjectSummary } from "@shared/types"

export type ProjectActions = {
  // A pinned project opens. The open project's row toggles its chat list instead.
  onOpen: (project: ProjectSummary) => void
  onToggle: (project: ProjectSummary) => void
  onNewChat: (project: ProjectSummary) => void
  onPin: (project: ProjectSummary) => void
  onRemove: (project: ProjectSummary) => void
}

export type ProjectRowProps = ProjectActions & {
  project: ProjectSummary
  // The dot for a project that is not open. The open project shows a chevron instead.
  status: ChatStatus
  active: boolean
  collapsed: boolean
  // "⌘" or "Ctrl+", for the new chat hint.
  modKey: string
}

// A project line in the sidebar: the open project with its chevron, or a pinned project.
export function ProjectRow({ project, status, active, collapsed, modKey, onOpen, onToggle, onNewChat, onPin, onRemove }: ProjectRowProps) {
  return (
    <div className="group flex w-full min-w-0 items-center overflow-hidden rounded-md">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
        aria-expanded={active ? !collapsed : undefined}
        onClick={() => {
          if (active) {
            onToggle(project)
            return
          }
          onOpen(project)
        }}
      >
        {active ? (
          <ChevronRightIcon className={cn("size-3 shrink-0 text-foreground/40 transition-transform duration-150", !collapsed && "rotate-90")} />
        ) : (
          <StatusDot status={status} />
        )}
        <span className={cn("truncate", active ? "font-medium" : "text-foreground/80")}>{project.name}</span>
        {project.pinned ? <PinIcon className="size-3 shrink-0 text-foreground/40" /> : null}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-foreground/50 hover:text-foreground"
        title={`New chat in ${project.name}${active ? ` (${modKey}N)` : ""}`}
        aria-label={`New chat in ${project.name}`}
        onClick={() => onNewChat(project)}
      >
        <SquarePenIcon className="size-3.5" />
      </Button>
      <RowMenu label={`${project.name} actions`}>
        <DropdownMenuItem onSelect={() => onPin(project)}>{project.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove(project)}>
          Remove project
        </DropdownMenuItem>
      </RowMenu>
    </div>
  )
}
