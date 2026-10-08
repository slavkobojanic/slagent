import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"
import { NewChatRow } from "@/features/library/sidebar/new-chat-row"

export type OpenProjectProps = {
  project: ProjectSummary | null
  collapsed: boolean
  onToggle: (project: ProjectSummary) => void
  onNewChat: () => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ChatList: ComponentType
}

// The open project's section inside the unified project list: an active row, its draft row, and its
// chats. The sidebar renders it in the project's alphabetical place, not in a section of its own.
export function OpenProject({ project, collapsed, onToggle, onNewChat, ProjectRow, ChatList }: OpenProjectProps) {
  if (project === null) {
    return null
  }
  return (
    <section className="space-y-1">
      <ProjectRow project={project} active collapsed={collapsed} onSelect={onToggle} />
      {/* Keyed by project so switching projects mounts the list without replaying the enter animation. */}
      {collapsed ? null : (
        <>
          <NewChatRow label="New chat" onNew={onNewChat} />
          <ChatList key={project.id} />
        </>
      )}
    </section>
  )
}
