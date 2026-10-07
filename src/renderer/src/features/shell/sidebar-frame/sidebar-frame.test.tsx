import { describe, expect, it } from "vitest"
import { SidebarFrame, type SidebarFrameProps } from "@/features/shell/sidebar-frame/sidebar-frame"
import { viewMarkup } from "@/test/view-markup"

const base: SidebarFrameProps = {
  open: true,
  width: 256,
  resizing: false,
  Library: function Library() {
    return <aside>library</aside>
  },
}

function slotTag(markup: string): string {
  const start = markup.indexOf('class="sidebar-slot"')
  return markup.slice(start, markup.indexOf(">", start) + 1)
}

describe("SidebarFrame", () => {
  it("can render the library inside the sidebar slot", () => {
    const markup = viewMarkup(<SidebarFrame {...base} />)

    expect(markup).toContain("<aside>library</aside>")
  })

  it("can collapse the sidebar slot and make it inert when the sidebar is closed", () => {
    const markup = viewMarkup(<SidebarFrame {...base} open={false} />)

    expect(slotTag(markup)).toContain('data-closed="true"')
    expect(slotTag(markup)).toContain('inert=""')
  })

  it("can keep the sidebar slot open and interactive while the sidebar is open", () => {
    const markup = viewMarkup(<SidebarFrame {...base} />)

    expect(slotTag(markup)).not.toContain("data-closed")
    expect(slotTag(markup)).not.toContain("inert")
  })

  it("can set the sidebar width on the slot", () => {
    const markup = viewMarkup(<SidebarFrame {...base} width={300} />)

    expect(slotTag(markup)).toContain("--sidebar-width: 300px")
  })

  it("can mark the slot while the sidebar is being resized", () => {
    const markup = viewMarkup(<SidebarFrame {...base} resizing />)

    expect(slotTag(markup)).toContain('data-resizing="true"')
  })
})
