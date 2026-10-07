import { makeAutoObservable } from "mobx"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import { projectStatus } from "@/lib/projects"
import type { LibraryStore } from "@/mirror/library-store/library-store"

export type PinnedProject = { project: ProjectSummary; status: ChatStatus }

export class PinnedProjectsStore {
  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  // Pinned projects other than the open one, newest pin first.
  get pinned(): PinnedProject[] {
    const { projects, openProjectId } = this.libraryStore.library
    return projects
      .filter((project) => project.pinned && project.id !== openProjectId)
      .sort((left, right) => right.pinnedAt - left.pinnedAt)
      .map((project) => ({ project, status: projectStatus(project) }))
  }
}
