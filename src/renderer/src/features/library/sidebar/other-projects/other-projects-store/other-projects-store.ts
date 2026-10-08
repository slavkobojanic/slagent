import { makeAutoObservable } from "mobx"
import type { ChatStatus, ChatSummary, ProjectSummary } from "@shared/types"
import { projectStatus } from "@/lib/projects"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export type OtherProject = { project: ProjectSummary; status: ChatStatus }

export class OtherProjectsStore {
  collapsedIds: Record<string, boolean> = {}
  showAllIds: Record<string, boolean> = {}
  reduceMotion = false

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  // Every project other than the open one, pinned ones first (newest pin), then most recently opened.
  get others(): OtherProject[] {
    const { projects, openProjectId } = this.libraryStore.library
    return projects
      .filter((project) => project.id !== openProjectId)
      .sort((left, right) => {
        if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
        if (left.pinned && right.pinned) return right.pinnedAt - left.pinnedAt
        return right.lastOpenedAt - left.lastOpenedAt
      })
      .map((project) => ({ project, status: projectStatus(project) }))
  }

  chatsOf(projectId: string): ChatSummary[] {
    return this.libraryStore.library.chatsByProject[projectId] ?? []
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
