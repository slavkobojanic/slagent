import type { ProjectSummary } from "@shared/types"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"

export class ProjectRowPresenter {
  private disposer: (() => void) | null = null

  constructor(
    private readonly api: API,
    private readonly window: Window,
    private readonly libraryStore: LibraryStore,
    private readonly composerPort: ComposerPort,
    private readonly commandRegistry: CommandRegistry,
    private readonly projectRemovalStore: ProjectRemovalStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = this.commandRegistry.register({
      id: "chat.new",
      label: "New chat",
      group: "Actions",
      shortcut: { key: "n", mod: true },
      enabled: () => this.libraryStore.openProjectId !== null,
      run: () => {
        this.log.action("new-chat", { projectId: this.libraryStore.openProjectId })
        void this.newChat()
      },
    })
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
  }

  handleNewChat = (project: ProjectSummary) => {
    this.log.action("new-chat", { projectId: project.id })
    return this.newChat(project.id)
  }

  handlePin = (project: ProjectSummary) => {
    this.log.action(project.pinned ? "unpin-project" : "pin-project", { projectId: project.id })
    return toastFailure(() => this.api.pinProject(project.id, !project.pinned))
  }

  handleRemove = (project: ProjectSummary) => {
    this.log.action("ask-remove-project", { projectId: project.id, name: project.name })
    this.projectRemovalStore.setTarget(project)
  }

  // The composer gets focus even when the draft fails to start, so the user can type straight away.
  private newChat = async (projectId?: string) => {
    await toastFailure(async () => {
      if (projectId !== undefined && projectId !== this.libraryStore.openProjectId) {
        await this.api.openProject(projectId)
      }
      await this.api.newChat()
    })
    this.window.requestAnimationFrame(() => {
      this.composerPort.focus()
    })
  }
}
