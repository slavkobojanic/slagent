import { AnimatePresence, motion } from "motion/react"
import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"

// Same feel as the chat rows entering a chat list (chat-list.tsx): fast, subtle, no bounce.
const SECTION_TRANSITION = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }
const INSTANT_TRANSITION = { duration: 0 }

export type OtherProjectItem = { project: ProjectSummary; active: boolean }

export type OtherProjectsProps = {
  // The fake "No project" group that stands in for chats without a picked folder.
  noProject: OtherProjectItem | null
  others: OtherProjectItem[]
  isCollapsed: (projectId: string) => boolean
  onToggle: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ProjectChatList: ComponentType<{ projectId: string }>
  // The open project's section: an active row with its draft row and keyboard-navigable chat list.
  OpenProject: ComponentType
  reduceMotion: boolean
}

// "No project" first, then every code project under a Projects heading, pinned first and both
// groups alphabetically. Rows
// collapse on click; opening a chat or starting a new one switches the project.
// Observed because the collapse reads (`isCollapsed`) happen right here, not in the host above:
// without tracking, toggling a row's chevron would update the store but never re-render.
export const OtherProjects = observer(function OtherProjects({ noProject, others, isCollapsed, onToggle, ProjectRow, ProjectChatList, OpenProject, reduceMotion }: OtherProjectsProps) {
  const renderProject = ({ project, active }: OtherProjectItem) => {
    // The open project renders its own section, active and expanded, with its chat list.
    if (active) {
      return <OpenProject key={project.id} />
    }
    const collapsed = isCollapsed(project.id)
    return (
      <div key={project.id} className="space-y-1">
        <ProjectRow project={project} active={false} collapsed={collapsed} onSelect={onToggle} />
        <AnimatePresence initial={false}>
          {collapsed ? null : (
            <motion.div
              key="content"
              className="space-y-1 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduceMotion ? INSTANT_TRANSITION : SECTION_TRANSITION}
            >
              <ProjectChatList key={project.id} projectId={project.id} />
            </motion.div>
          )}
        </AnimatePresence>
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
