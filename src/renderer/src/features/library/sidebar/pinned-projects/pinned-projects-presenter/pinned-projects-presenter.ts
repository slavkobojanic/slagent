import type { ProjectSummary } from "@shared/types"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"

export class PinnedProjectsPresenter {
  constructor(private readonly api: API) {}

  handleOpen = (project: ProjectSummary) => toastFailure(() => this.api.openProject(project.id))
}
