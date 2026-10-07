import { makeAutoObservable } from "mobx"
import type { ProjectSummary } from "@shared/types"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export class OpenProjectStore {
  collapsedIds: Record<string, boolean> = {}

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  get project(): ProjectSummary | null {
    const { projects, openProjectId } = this.libraryStore.library
    if (openProjectId === null) {
      return null
    }
    return projects.find((project) => project.id === openProjectId) ?? null
  }

  get collapsed(): boolean {
    if (this.project === null) {
      return false
    }
    return this.isCollapsed(this.project.id)
  }

  isCollapsed(projectId: string): boolean {
    return this.collapsedIds[projectId] === true
  }

  setCollapsed(projectId: string, value: boolean) {
    this.collapsedIds[projectId] = value
  }
}
