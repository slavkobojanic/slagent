import type { ProjectSummary } from "@shared/types"

// Pinned projects first, both groups alphabetical so rows never shuffle as projects are opened.
export function sortedProjects(projects: ProjectSummary[]): ProjectSummary[] {
  const byName = (left: ProjectSummary, right: ProjectSummary) => left.name.localeCompare(right.name)
  const pinned = projects.filter((project) => project.pinned).sort(byName)
  const rest = projects.filter((project) => !project.pinned).sort(byName)
  return [...pinned, ...rest]
}

export type ProjectStatus = "running" | "done" | "idle"

export function projectStatus(project: ProjectSummary): ProjectStatus {
  if (project.running) {
    return "running"
  }
  if (project.attention) {
    return "done"
  }
  return "idle"
}
