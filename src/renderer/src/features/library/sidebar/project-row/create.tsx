import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import { modKey } from "@/lib/format"
import { NO_PROJECT_ID } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ProjectRow } from "./project-row"
import { ProjectRowMenu } from "./project-row-menu/project-row-menu"
import { ProjectRowPresenter } from "./project-row-presenter/project-row-presenter"

type ProjectRowHostProps = {
  project: ProjectSummary
  active: boolean
  collapsed: boolean
  onSelect: (project: ProjectSummary) => void
}

export function createProjectRow({
  api,
  window,
  libraryStore,
  composerPort,
  commandRegistry,
  projectRemovalStore,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  composerPort: ComposerPort
  commandRegistry: CommandRegistry
  projectRemovalStore: ProjectRemovalStore
  log: Log
}): ComponentType<ProjectRowHostProps> {
  const presenter = new ProjectRowPresenter(api, window, libraryStore, composerPort, commandRegistry, projectRemovalStore, log)
  presenter.start()
  const mod = modKey(api.platform)

  return function ProjectRowHost({ project, active, collapsed, onSelect }: ProjectRowHostProps) {
    return (
      <ProjectRow
        project={project}
        active={active}
        collapsed={collapsed}
        modKey={mod}
        onSelect={onSelect}
        onNewChat={presenter.handleNewChat}
        menu={project.id === NO_PROJECT_ID ? null : <ProjectRowMenu project={project} onPin={presenter.handlePin} onRemove={presenter.handleRemove} />}
      />
    )
  }
}
