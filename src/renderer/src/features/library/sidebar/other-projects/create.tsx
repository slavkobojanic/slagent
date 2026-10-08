import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { PinnedProjects } from "./pinned-projects"
import { PinnedProjectsPresenter } from "./pinned-projects-presenter/pinned-projects-presenter"
import { PinnedProjectsStore } from "./pinned-projects-store/pinned-projects-store"

export function createPinnedProjects({
  api,
  libraryStore,
  ProjectRow,
  log,
}: {
  api: API
  libraryStore: LibraryStore
  ProjectRow: ComponentType<{
    project: ProjectSummary
    status: ChatStatus
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  log: Log
}): ComponentType {
  const store = new PinnedProjectsStore(libraryStore)
  const presenter = new PinnedProjectsPresenter(api, log)

  return observer(function PinnedProjectsHost() {
    return <PinnedProjects pinned={store.pinned} onOpen={presenter.handleOpen} ProjectRow={ProjectRow} />
  })
}
