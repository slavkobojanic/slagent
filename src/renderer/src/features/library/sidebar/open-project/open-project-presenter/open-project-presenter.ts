import type { ProjectSummary } from "@shared/types"
import type { OpenProjectStore } from "@/features/library/sidebar/open-project/open-project-store/open-project-store"
import type { Log } from "@/log/log"

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export class OpenProjectPresenter {
  private media: MediaQueryList | null = null

  constructor(
    private readonly store: OpenProjectStore,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.media) {
      return
    }
    this.media = this.window.matchMedia(REDUCE_MOTION_QUERY)
    this.store.setReduceMotion(this.media.matches)
    this.media.addEventListener("change", this.handleMotionChange)
  }

  private handleMotionChange = (event: MediaQueryListEvent) => {
    this.store.setReduceMotion(event.matches)
  }

  handleToggle = (project: ProjectSummary) => {
    const collapsed = !this.store.isCollapsed(project.id)
    this.log.action("toggle-project", { projectId: project.id, collapsed })
    this.store.setCollapsed(project.id, collapsed)
  }

  stop = () => {
    this.media?.removeEventListener("change", this.handleMotionChange)
    this.media = null
  }
}
