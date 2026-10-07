import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"

export class ProjectMenuPresenter {
  constructor(
    private readonly store: ProjectMenuStore,
    private readonly api: API,
  ) {}

  openProject = async (projectId: string) => {
    this.store.setError(null)
    try {
      await this.api.openProject(projectId)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  chooseFolder = async () => {
    this.store.setError(null)
    try {
      await this.api.chooseFolder()
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }
}
