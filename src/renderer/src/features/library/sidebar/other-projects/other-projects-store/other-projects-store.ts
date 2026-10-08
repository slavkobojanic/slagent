import { makeAutoObservable } from "mobx"
import type { ChatStatus, ChatSummary, ProjectSummary } from "@shared/types"
import { projectStatus } from "@/lib/projects"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export type OtherProject = { project: ProjectSummary; status: ChatStatus; active: boolean }

// The id of the fake "No project" group that stands in for chats without a picked folder: every
// "chat" project contributes its chats to this one row at the top of the sidebar.
export const NO_PROJECT_ID = "no-project"

export class OtherProjectsStore {
  collapsedIds: Record<string, boolean> = {}
  showAllIds: Record<string, boolean> = {}
  reduceMotion = false

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  // The fake "No project" project that aggregates the chats of every "chat" project, the open one
  // included: the sidebar has no separate open-project section.
  get noProject(): ProjectSummary | null {
    const chats = this.chatsOf(NO_PROJECT_ID)
    if (this.chatProjects().length === 0) return null
    return {
      id: NO_PROJECT_ID,
      path: "",
      name: "No project",
      mode: "chat",
      pinned: false,
      pinnedAt: 0,
      lastOpenedAt: 0,
      running: chats.some((chat) => chat.running),
      attention: chats.some((chat) => chat.status === "waiting" || chat.status === "error"),
    }
  }

  // Every code project, alphabetical so rows never shuffle as projects are opened or pinned. The
  // open one carries `active` and keeps its expanded chat list; "chat" projects live in the "No
  // project" group instead.
  get others(): OtherProject[] {
    const { projects, openProjectId } = this.libraryStore.library
    return projects
      .filter((project) => (project.mode ?? "code") === "code")
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((project) => ({ project, status: projectStatus(project), active: project.id === openProjectId }))
  }

  chatsOf(projectId: string): ChatSummary[] {
    if (projectId === NO_PROJECT_ID) {
      return this.chatProjects().flatMap((project) => this.chatsOfProject(project.id))
    }
    return this.chatsOfProject(projectId)
  }

  private chatProjects(): ProjectSummary[] {
    return this.libraryStore.library.projects.filter((project) => (project.mode ?? "code") === "chat")
  }

  // The open project's chats live in `chats`; the other projects' in `chatsByProject`.
  private chatsOfProject(projectId: string): ChatSummary[] {
    const library = this.libraryStore.library
    if (projectId === library.openProjectId) {
      return library.chats
    }
    return library.chatsByProject[projectId] ?? []
  }

  isCollapsed(projectId: string): boolean {
    return this.collapsedIds[projectId] === true
  }

  setCollapsed(projectId: string, value: boolean) {
    this.collapsedIds[projectId] = value
  }

  isShowingAll(projectId: string): boolean {
    return this.showAllIds[projectId] === true
  }

  setShowAll(projectId: string, value: boolean) {
    this.showAllIds[projectId] = value
  }

  setReduceMotion(value: boolean) {
    this.reduceMotion = value
  }
}
