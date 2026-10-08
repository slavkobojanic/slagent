import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
import { ProjectRow, type ProjectRowProps } from "@/features/library/sidebar/project-row/project-row"
import { ProjectRowMenu } from "@/features/library/sidebar/project-row/project-row-menu/project-row-menu"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const summary: ProjectSummary = {
  id: "p1",
  path: "/work/atlas",
  name: "Atlas",
  pinned: false,
  pinnedAt: 0,
  lastOpenedAt: 0,
  running: false,
  attention: false,
}

const base: ProjectRowProps = {
  project: summary,
  active: true,
  collapsed: false,
  modKey: "⌘",
  onSelect: noop,
  onNewChat: noop,
  menu: <ProjectRowMenu project={summary} onPin={noop} onRemove={noop} />,
}

// The opening tag of the row's own button. The row menu's trigger also carries aria-expanded, so the tag is checked whole.
function rowButtonTag(html: string): string {
  const start = html.indexOf('<button type="button" class="flex min-w-0 flex-1')
  const end = html.indexOf(">", start)
  return html.slice(start, end + 1)
}

describe("ProjectRow", () => {
  it("can show the open project expanded, with the new chat shortcut in its hint", () => {
    const html = viewMarkup(<ProjectRow {...base} />)

    expect(rowButtonTag(html)).toContain('aria-expanded="true"')
    expect(html).toContain("New chat in Atlas (⌘N)")
  })

  it("can show the open project collapsed when its chats are hidden", () => {
    const html = viewMarkup(<ProjectRow {...base} collapsed />)

    expect(rowButtonTag(html)).toContain('aria-expanded="false"')
  })

  it("can show a pinned project with no shortcut hint", () => {
    const html = viewMarkup(<ProjectRow {...base} active={false} project={{ ...summary, pinned: true }} />)

    expect(html).toContain('title="New chat in Atlas"')
  })

  it("can show a project that is not open as an expandable row too", () => {
    const html = viewMarkup(<ProjectRow {...base} active={false} collapsed />)

    expect(rowButtonTag(html)).toContain('aria-expanded="false"')
  })
})
