import { ChevronRightIcon, PinIcon, SquarePenIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import { Button } from "@/components/ui/button"
import { StatusDot } from "@/features/library/sidebar/status-dot/status-dot"
import { cn } from "@/lib/utils"

export type ProjectRowProps = {
  project: ProjectSummary
  // Only a project that is not open shows its dot. The open project shows a chevron instead.
  status: ChatStatus
  active: boolean
  collapsed: boolean
  modKey: string
  onSelect: (project: ProjectSummary) => void
  onNewChat: (project: ProjectSummary) => void
  menu: ReactNode
}

export function ProjectRow({ project, status, active, collapsed, modKey, onSelect, onNewChat, menu }: ProjectRowProps) {
  return (
    <div className="group flex w-full min-w-0 items-center overflow-hidden rounded-md">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
        aria-expanded={active ? !collapsed : undefined}
        onClick={() => onSelect(project)}
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
      {menu}
    </div>
  )
}
