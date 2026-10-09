import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { ProjectAppearanceStore } from "./project-appearance-store/project-appearance-store"
import { ProjectAppearance } from "./project-appearance"
import { ProjectAppearancePresenter } from "./project-appearance-presenter/project-appearance-presenter"

export function createProjectAppearance({
  api,
  store,
  log,
}: {
  api: API
  store: ProjectAppearanceStore
  log: Log
}): ComponentType {
  const presenter = new ProjectAppearancePresenter(store, api, log)

  return function ProjectAppearanceHost() {
    return (
      <ProjectAppearance
        open={store.open}
        projectName={store.target?.name ?? ""}
        icon={store.icon}
        color={store.color}
        busy={store.busy}
        error={store.error}
        onIcon={presenter.handleIcon}
        onColor={presenter.handleColor}
        onCancel={presenter.handleClose}
        onConfirm={() => void presenter.handleConfirm()}
      />
    )
  }
}
