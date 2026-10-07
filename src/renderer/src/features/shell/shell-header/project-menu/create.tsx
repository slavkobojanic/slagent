import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { projectStatus, sortedProjects } from "@/lib/projects"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { ProjectMenu } from "./project-menu"
import { ProjectMenuPresenter } from "./project-menu-presenter/project-menu-presenter"
import type { ProjectMenuStore } from "./project-menu-store/project-menu-store"
import { openProjectOf } from "./project-menu-utils"

export function createProjectMenu({
  api,
  libraryStore,
  projectMenuStore,
}: {
  api: API
  libraryStore: LibraryStore
  projectMenuStore: ProjectMenuStore
}): ComponentType {
  const presenter = new ProjectMenuPresenter(projectMenuStore, api)

  return observer(function ProjectMenuHost() {
    const library = libraryStore.library
    const project = openProjectOf(library)
    return (
      <ProjectMenu
        label={project?.name ?? "Choose folder"}
        path={project?.path}
        projects={sortedProjects(library.projects).map((item) => ({ id: item.id, name: item.name, status: projectStatus(item) }))}
        onOpenProject={presenter.openProject}
        onChooseFolder={presenter.chooseFolder}
      />
    )
  })
}
