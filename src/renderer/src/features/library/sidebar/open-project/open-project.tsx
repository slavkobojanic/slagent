import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import { NewChatRow } from "@/features/library/sidebar/new-chat-row"

export type OpenProjectProps = {
  project: ProjectSummary | null
  collapsed: boolean
  onToggle: (project: ProjectSummary) => void
  onNewChat: () => void
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

export function OpenProject({ project, collapsed, onToggle, onNewChat, ProjectRow, ChatList, ChooseFolder }: OpenProjectProps) {
  if (project === null) {
    return <ChooseFolder />
  }
  return (
    <section className="space-y-1">
      <ProjectRow project={project} status="idle" active collapsed={collapsed} onSelect={onToggle} />
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
