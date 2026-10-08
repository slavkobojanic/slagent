import { makeAutoObservable } from "mobx"
import type { ChatStatus, ChatSummary, ProjectSummary } from "@shared/types"
import { projectStatus } from "@/lib/projects"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export type OtherProject = { project: ProjectSummary; status: ChatStatus }

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

  // The fake "No project" project that aggregates the chats of every "chat" project, except the
  // open one: its chats already show in the open-project section at the top of the sidebar.
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

  // Every code project other than the open one, alphabetical so rows never shuffle as projects are
  // opened or pinned. "Chat" projects live in the "No project" group instead.
  get others(): OtherProject[] {
    const { projects, openProjectId } = this.libraryStore.library
    return projects
      .filter((project) => project.id !== openProjectId && (project.mode ?? "code") === "code")
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((project) => ({ project, status: projectStatus(project) }))
  }

  chatsOf(projectId: string): ChatSummary[] {
    if (projectId === NO_PROJECT_ID) {
      return this.chatProjects().flatMap((project) => this.libraryStore.library.chatsByProject[project.id] ?? [])
    }
    return this.libraryStore.library.chatsByProject[projectId] ?? []
  }

  private chatProjects(): ProjectSummary[] {
    const { projects, openProjectId } = this.libraryStore.library
    return projects.filter((project) => (project.mode ?? "code") === "chat" && project.id !== openProjectId)
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
