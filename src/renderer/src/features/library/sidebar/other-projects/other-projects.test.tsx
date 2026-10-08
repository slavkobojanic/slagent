import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OtherProjects, type OtherProjectsProps } from "@/features/library/sidebar/other-projects/other-projects"
import { viewMarkup } from "@/test/view-markup"

const beta: ProjectSummary = { id: "p2", path: "/work/p2", name: "Beta", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

const noProject = { project: { id: "no-project", path: "", name: "No project", mode: "chat", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false } as ProjectSummary, active: false }

const base: OtherProjectsProps = {
  noProject: null,
  others: [{ project: beta, active: false }],
  isCollapsed: () => false,
  onToggle: () => undefined,
  ProjectRow: ({ project, active, collapsed }) => (
    <div data-active={active} data-collapsed={collapsed}>
      {project.name}
    </div>
  ),
  ProjectChatList: ({ projectId }) => <div data-slot="chat-list" data-project={projectId} />,
  OpenProject: () => <div data-slot="open-project" />,
  reduceMotion: true,
}

describe("OtherProjects", () => {
  it("can list projects under a heading, each expanded with its chat list", () => {
    const html = viewMarkup(<OtherProjects {...base} />)

    expect(html).toContain("Projects")
    expect(html).toContain("Beta")
    expect(html).toContain('data-active="false"')
    expect(html).toContain('data-slot="chat-list"')
    expect(html).toContain('data-project="p2"')
  })

  it("can render the open project's section in its alphabetical place, without a chat list row", () => {
    const html = viewMarkup(<OtherProjects {...base} others={[{ project: beta, active: true }]} />)

    expect(html).toContain('data-slot="open-project"')
    expect(html).not.toContain('data-project="p2"')
  })

  it("can leave out a collapsed project's chat list", () => {
    const html = viewMarkup(<OtherProjects {...base} isCollapsed={() => true} />)

    expect(html).toContain('data-collapsed="true"')
    expect(html).not.toContain('data-slot="chat-list"')
  })

  it("can render nothing when no project exists", () => {
    expect(viewMarkup(<OtherProjects {...base} others={[]} />)).toBe("")
  })

  it("can render the No project group above the Projects heading", () => {
    const html = viewMarkup(<OtherProjects {...base} noProject={noProject} />)

    expect(html.indexOf("No project")).toBeLessThan(html.indexOf("Projects"))
    expect(html).toContain('data-project="no-project"')
  })

  it("can render only the No project group, without the Projects heading", () => {
    const html = viewMarkup(<OtherProjects {...base} others={[]} noProject={noProject} />)

    expect(html).toContain("No project")
    expect(html).not.toContain(">Projects<")
  })
})