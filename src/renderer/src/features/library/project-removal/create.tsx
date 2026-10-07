import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import { ProjectRemoval } from "./project-removal"
import { ProjectRemovalPresenter } from "./project-removal-presenter/project-removal-presenter"

export function createProjectRemoval({ api, projectRemovalStore }: { api: API; projectRemovalStore: ProjectRemovalStore }): ComponentType {
  const presenter = new ProjectRemovalPresenter(projectRemovalStore, api)

  return observer(function ProjectRemovalHost() {
    return (
      <ProjectRemoval
        open={projectRemovalStore.open}
        projectName={projectRemovalStore.target?.name ?? ""}
        projectPath={projectRemovalStore.target?.path ?? ""}
        typed={projectRemovalStore.typed}
        confirmed={projectRemovalStore.confirmed}
        busy={projectRemovalStore.busy}
        onTypedChange={presenter.handleTypedChange}
        onCancel={presenter.handleCancel}
        onConfirm={() => void presenter.handleConfirm()}
      />
    )
  })
}
