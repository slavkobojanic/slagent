import type { ProjectSummary } from "@shared/types"

export function sortedProjects(projects: ProjectSummary[]): ProjectSummary[] {
  return [...projects].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
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
