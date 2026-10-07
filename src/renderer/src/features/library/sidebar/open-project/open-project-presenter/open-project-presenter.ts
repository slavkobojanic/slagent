import type { ProjectSummary } from "@shared/types"
import type { OpenProjectStore } from "@/features/library/sidebar/open-project/open-project-store/open-project-store"
import type { Log } from "@/log/log"

export class OpenProjectPresenter {
  constructor(
    private readonly store: OpenProjectStore,
    private readonly log: Log,
  ) {}

  handleToggle = (project: ProjectSummary) => {
    const collapsed = !this.store.isCollapsed(project.id)
    this.log.action("toggle-project", { projectId: project.id, collapsed })
    this.store.setCollapsed(project.id, collapsed)
  }
}
