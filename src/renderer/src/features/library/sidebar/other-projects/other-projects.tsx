import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import { NewChatRow } from "@/features/library/sidebar/new-chat-row"

export type OtherProjectsProps = {
  others: { project: ProjectSummary; status: ChatStatus }[]
  isCollapsed: (projectId: string) => boolean
  onToggle: (project: ProjectSummary) => void
  onNewChat: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    status: ChatStatus
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ProjectChatList: ComponentType<{ projectId: string }>
}

// Every project other than the open one, each an expandable section with its chats. Rows collapse
// on click; opening a chat or starting a new one switches the project.
export function OtherProjects({ others, isCollapsed, onToggle, onNewChat, ProjectRow, ProjectChatList }: OtherProjectsProps) {
  if (others.length === 0) {
    return null
  }
  return (
    <section className="space-y-1">
      <h2 className="px-2 text-xs font-medium text-foreground/40">Projects</h2>
      {others.map(({ project, status }) => {
        const collapsed = isCollapsed(project.id)
        return (
          <div key={project.id} className="space-y-1">
            <ProjectRow project={project} status={status} active={false} collapsed={collapsed} onSelect={onToggle} />
            {collapsed ? null : (
              <>
                <NewChatRow label="New chat" onNew={() => onNewChat(project)} />
                {/* Keyed by project so expanding one section mounts its list without replaying the others. */}
                <ProjectChatList key={project.id} projectId={project.id} />
              </>
            )}
          </div>
        )
      })}
    </section>
  )
}
