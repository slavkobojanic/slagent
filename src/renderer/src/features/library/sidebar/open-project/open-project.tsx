import { AnimatePresence, motion } from "motion/react"
import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"

// Same feel as the chat rows entering a chat list (chat-list.tsx): fast, subtle, no bounce.
const SECTION_TRANSITION = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }
const INSTANT_TRANSITION = { duration: 0 }

export type OpenProjectProps = {
  project: ProjectSummary | null
  collapsed: boolean
  onToggle: (project: ProjectSummary) => void
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  ChatList: ComponentType
  reduceMotion: boolean
}

// The open project's section inside the unified project list: an active row, its draft row, and its
// chats. The sidebar renders it in the project's alphabetical place, not in a section of its own.
export function OpenProject({ project, collapsed, onToggle, ProjectRow, ChatList, reduceMotion }: OpenProjectProps) {
  if (project === null) {
    return null
  }
  return (
    <section className="space-y-1">
      <ProjectRow project={project} active collapsed={collapsed} onSelect={onToggle} />
      {/* Keyed by project so switching projects mounts the list without replaying the enter animation. */}
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
            <ChatList key={project.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
