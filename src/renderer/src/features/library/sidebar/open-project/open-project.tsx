import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"

export type OpenProjectProps = {
  project: ProjectSummary | null
  collapsed: boolean
  onToggle: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    status: ChatStatus
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ChatList: ComponentType
  ChooseFolder: ComponentType
}

export function OpenProject({ project, collapsed, onToggle, ProjectRow, ChatList, ChooseFolder }: OpenProjectProps) {
  if (project === null) {
    return <ChooseFolder />
  }
  return (
    <section className="space-y-1">
      <ProjectRow project={project} status="idle" active collapsed={collapsed} onSelect={onToggle} />
      {/* Keyed by project so switching projects mounts the list without replaying the enter animation. */}
      {collapsed ? null : <ChatList key={project.id} />}
    </section>
  )
}
