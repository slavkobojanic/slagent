import type { ProjectSummary } from "@shared/types"
import { toastFailure } from "@/features/library/toast-failure"
import { NO_PROJECT_ID, type OtherProjectsStore } from "@/features/library/sidebar/other-projects/other-projects-store/other-projects-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export class OtherProjectsPresenter {
  private started = false
  private disposers: (() => void)[] = []
  private media: MediaQueryList | null = null

  constructor(
    private readonly store: OtherProjectsStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.media = this.window.matchMedia(REDUCE_MOTION_QUERY)
    this.store.setReduceMotion(this.media.matches)
    this.media.addEventListener("change", this.handleMotionChange)
    this.disposers.push(() => {
      this.media?.removeEventListener("change", this.handleMotionChange)
      this.media = null
    })
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  handleToggle = (project: ProjectSummary) => {
    const collapsed = !this.store.isCollapsed(project.id)
    this.log.action("toggle-project", { projectId: project.id, collapsed })
    this.store.setCollapsed(project.id, collapsed)
  }

  handleShowAll = (projectId: string) => {
    this.log.action("show-all-chats", { projectId })
    this.store.setShowAll(projectId, true)
  }

  handleShowLess = (projectId: string) => {
    this.log.action("show-fewer-chats", { projectId })
    this.store.setShowAll(projectId, false)
  }

  handleNewChat = (project: ProjectSummary) => {
    this.log.action("new-chat", { projectId: project.id })
    if (project.id === NO_PROJECT_ID) {
      // The fake group has no project to add a chat to: start a new "chat" project instead.
      return toastFailure(() => this.api.createChatProject())
    }
    return toastFailure(() => this.api.newChat(project.id))
  }

  private handleMotionChange = (event: MediaQueryListEvent) => {
    this.store.setReduceMotion(event.matches)
  }
}
