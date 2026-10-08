import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"

export type PinnedProjectsProps = {
  pinned: { project: ProjectSummary; status: ChatStatus }[]
  onOpen: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    status: ChatStatus
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
}

export function PinnedProjects({ pinned, onOpen, ProjectRow }: PinnedProjectsProps) {
  if (pinned.length === 0) {
    return null
  }
  return (
    <section className="space-y-1">
      <h2 className="px-2 text-xs font-medium text-foreground/40">Pinned</h2>
      {pinned.map(({ project, status }) => (
        <ProjectRow key={project.id} project={project} status={status} active={false} collapsed={false} onSelect={onOpen} />
      ))}
    </section>
  )
}
