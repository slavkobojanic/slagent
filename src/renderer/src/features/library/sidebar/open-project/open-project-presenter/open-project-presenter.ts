import type { ProjectSummary } from "@shared/types"
import type { OpenProjectStore } from "@/features/library/sidebar/open-project/open-project-store/open-project-store"

export class OpenProjectPresenter {
  constructor(private readonly store: OpenProjectStore) {}

  handleToggle = (project: ProjectSummary) => {
    this.store.setCollapsed(project.id, !this.store.isCollapsed(project.id))
  }
}
