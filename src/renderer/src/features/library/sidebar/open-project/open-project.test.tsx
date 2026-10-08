import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { OpenProject, type OpenProjectProps } from "@/features/library/sidebar/open-project/open-project"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const atlas: ProjectSummary = { id: "p1", path: "/work/p1", name: "Atlas", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }

const base: OpenProjectProps = {
  project: atlas,
  collapsed: false,
  onToggle: noop,
  ProjectRow: ({ project, active, collapsed }) => <div data-slot="project-row" data-active={active} data-collapsed={collapsed}>{project.name}</div>,
  ChatList: () => <div data-slot="chat-list" />,
  reduceMotion: true,
}

describe("OpenProject", () => {
  it("can render nothing when no project is open", () => {
    expect(viewMarkup(<OpenProject {...base} project={null} />)).toBe("")
  })

  it("can show the open project's row as active, then its chats", () => {
    const html = viewMarkup(<OpenProject {...base} />)

    expect(html).toContain('data-active="true"')
    expect(html).toContain("Atlas")
    expect(html).toContain('data-slot="chat-list"')
  })

  it("can hide the open project's chats while the project is collapsed", () => {
    const html = viewMarkup(<OpenProject {...base} collapsed />)

    expect(html).toContain('data-collapsed="true"')
    expect(html).not.toContain('data-slot="chat-list"')
  })
})