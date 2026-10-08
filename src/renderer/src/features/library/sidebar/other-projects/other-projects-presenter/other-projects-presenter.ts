import type { ProjectSummary } from "@shared/types"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

export class PinnedProjectsPresenter {
  constructor(
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleOpen = (project: ProjectSummary) => {
    this.log.action("open-project", { projectId: project.id, name: project.name })
    return toastFailure(() => this.api.openProject(project.id))
  }
}
