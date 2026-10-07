import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"
import type { Log } from "@/log/log"

export class ProjectMenuPresenter {
  constructor(
    private readonly store: ProjectMenuStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  openProject = async (projectId: string) => {
    this.log.action("open-project", { projectId })
    this.store.setError(null)
    try {
      await this.api.openProject(projectId)
    } catch (error) {
      this.log.warn("open-project-failed", { projectId, error })
      this.store.setError(errorText(error))
    }
  }

  chooseFolder = async () => {
    this.log.action("choose-folder")
    this.store.setError(null)
    try {
      await this.api.chooseFolder()
    } catch (error) {
      this.log.warn("choose-folder-failed", { error })
      this.store.setError(errorText(error))
    }
  }
}
