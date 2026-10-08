import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OtherProjects, type OtherProjectsProps } from "@/features/library/sidebar/other-projects/other-projects"
import { viewMarkup } from "@/test/view-markup"

const beta: ProjectSummary = { id: "p2", path: "/work/p2", name: "Beta", pinned: true, pinnedAt: 1, lastOpenedAt: 0, running: false, attention: false }

const base: OtherProjectsProps = {
  others: [{ project: beta, status: "done" }],
  isCollapsed: () => false,
  onToggle: () => undefined,
  onNewChat: () => undefined,
  ProjectRow: ({ project, status, active, collapsed }) => (
    <div data-active={active} data-status={status} data-collapsed={collapsed}>
      {project.name}
    </div>
  ),
  ProjectChatList: ({ projectId }) => <div data-slot="chat-list" data-project={projectId} />,
}

describe("OtherProjects", () => {
  it("can list projects under a heading, each expanded with its draft row and chat list", () => {
    const html = viewMarkup(<OtherProjects {...base} />)

    expect(html).toContain("Projects")
    expect(html).toContain("Beta")
    expect(html).toContain('data-active="false"')
    expect(html).toContain('data-status="done"')
    expect(html).toContain("New chat")
    expect(html).toContain('data-slot="chat-list"')
    expect(html).toContain('data-project="p2"')
  })

  it("can leave out a collapsed project's chat list", () => {
    const html = viewMarkup(<OtherProjects {...base} isCollapsed={() => true} />)

    expect(html).toContain('data-collapsed="true"')
    expect(html).not.toContain('data-slot="chat-list"')
    expect(html).not.toContain("New chat")
  })

  it("can render nothing when no other project exists", () => {
    expect(viewMarkup(<OtherProjects {...base} others={[]} />)).toBe("")
  })
})
