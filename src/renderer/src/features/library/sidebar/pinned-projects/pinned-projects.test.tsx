import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { PinnedProjects, type PinnedProjectsProps } from "@/features/library/sidebar/pinned-projects/pinned-projects"
import { viewMarkup } from "@/test/view-markup"

const beta: ProjectSummary = { id: "p2", path: "/work/p2", name: "Beta", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

const ProjectRow: PinnedProjectsProps["ProjectRow"] = ({ project, status, active }) => (
  <div data-active={active} data-status={status}>
    {project.name}
  </div>
)

describe("PinnedProjects", () => {
  it("can list pinned projects under a heading, each with its status", () => {
    const html = viewMarkup(<PinnedProjects pinned={[{ project: beta, status: "done" }]} onOpen={() => undefined} ProjectRow={ProjectRow} />)

    expect(html).toContain("Pinned")
    expect(html).toContain("Beta")
    expect(html).toContain('data-active="false"')
    expect(html).toContain('data-status="done"')
  })

  it("can render nothing when no other project is pinned", () => {
    expect(viewMarkup(<PinnedProjects pinned={[]} onOpen={() => undefined} ProjectRow={ProjectRow} />)).toBe("")
  })
})
