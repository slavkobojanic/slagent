import { describe, expect, it } from "vitest"
import type { ProjectSummary } from "@shared/types"
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

describe("ProjectRowMenu", () => {
  it("can label its trigger for the project it belongs to", () => {
    const html = viewMarkup(<ProjectRowMenu project={summary} onPin={noop} onRemove={noop} />)

    expect(html).toContain('aria-label="Atlas actions"')
  })
})
