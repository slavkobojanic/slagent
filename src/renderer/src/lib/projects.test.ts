import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { projectStatus, sortedProjects } from "@/lib/projects"

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id: "p1", path: "/work/app", name: "app", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

describe("sortedProjects", () => {
  it("can list the most recently opened project first", () => {
    const projects = [project({ id: "old", lastOpenedAt: 1 }), project({ id: "new", lastOpenedAt: 2 })]

    expect(sortedProjects(projects).map((item) => item.id)).toEqual(["new", "old"])
  })

  it("can leave the input order unchanged", () => {
    const projects = [project({ id: "old", lastOpenedAt: 1 }), project({ id: "new", lastOpenedAt: 2 })]

    sortedProjects(projects)

    expect(projects.map((item) => item.id)).toEqual(["old", "new"])
  })
})

describe("projectStatus", () => {
  it("can show running while a chat in the project runs", () => {
    expect(projectStatus(project({ running: true }))).toBe("running")
  })

  it("can show done while a finished chat is unseen", () => {
    expect(projectStatus(project({ attention: true }))).toBe("done")
  })

  it("can show idle when nothing needs attention", () => {
    expect(projectStatus(project())).toBe("idle")
  })
})
