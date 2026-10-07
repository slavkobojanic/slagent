import type { ProjectSummary } from "@shared/types"

// The most recently opened project first. The input is not reordered.
export function sortedProjects(projects: ProjectSummary[]): ProjectSummary[] {
  return [...projects].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
}

export type ProjectStatus = "running" | "done" | "idle"

// A project shows running while a chat in it runs, and done while it has a finished chat nobody has seen.
export function projectStatus(project: ProjectSummary): ProjectStatus {
  if (project.running) {
    return "running"
  }
  if (project.attention) {
    return "done"
  }
  return "idle"
}
