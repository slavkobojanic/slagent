import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"
import { NewChatRow } from "@/features/library/sidebar/new-chat-row"

export type OtherProjectItem = { project: ProjectSummary; active: boolean }

export type OtherProjectsProps = {
  // The fake "No project" group that stands in for chats without a picked folder.
  noProject: OtherProjectItem | null
  others: OtherProjectItem[]
  isCollapsed: (projectId: string) => boolean
  onToggle: (project: ProjectSummary) => void
  onNewChat: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ProjectChatList: ComponentType<{ projectId: string }>
  // The open project's section: an active row with its draft row and keyboard-navigable chat list.
  OpenProject: ComponentType
}

// "No project" first, then every code project under a Projects heading, alphabetically. Rows
// collapse on click; opening a chat or starting a new one switches the project.
// Observed because the collapse reads (`isCollapsed`) happen right here, not in the host above:
// without tracking, toggling a row's chevron would update the store but never re-render.
export const OtherProjects = observer(function OtherProjects({ noProject, others, isCollapsed, onToggle, onNewChat, ProjectRow, ProjectChatList, OpenProject }: OtherProjectsProps) {
  const renderProject = ({ project, active }: OtherProjectItem) => {
    // The open project renders its own section, active and expanded, with its chat list.
    if (active) {
      return <OpenProject key={project.id} />
    }
    const collapsed = isCollapsed(project.id)
    return (
      <div key={project.id} className="space-y-1">
        <ProjectRow project={project} active={false} collapsed={collapsed} onSelect={onToggle} />
        {collapsed ? null : (
          <>
            <NewChatRow label="New chat" onNew={() => onNewChat(project)} />
            {/* Keyed by project so expanding one section mounts its list without replaying the others. */}
            <ProjectChatList key={project.id} projectId={project.id} />
          </>
        )}
      </div>
    )
  }
  if (!noProject && others.length === 0) {
    return null
  }
  return (
    <section className="space-y-1">
      {noProject ? renderProject(noProject) : null}
      {others.length === 0 ? null : (
        <>
          <h2 className="px-2 text-xs font-medium text-foreground/40">Projects</h2>
          {others.map(renderProject)}
        </>
      )}
    </section>
  )
})
