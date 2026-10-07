import type { LibraryState, ProjectSummary } from "@shared/types"

export function openProjectOf(library: LibraryState): ProjectSummary | null {
  if (library.openProjectId === null) {
    return null
  }
  return library.projects.find((project) => project.id === library.openProjectId) ?? null
}
