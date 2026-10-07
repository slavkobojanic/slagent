import { describe, expect, it } from "vitest"
import { SidebarResize } from "@/features/library/sidebar/sidebar-resize/sidebar-resize"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("SidebarResize", () => {
  it("can show the resize handle only while the sidebar is open", () => {
    expect(viewMarkup(<SidebarResize open resizing={false} onResizeStart={noop} onResizeReset={noop} />)).toContain('aria-label="Resize sidebar"')
    expect(viewMarkup(<SidebarResize open={false} resizing={false} onResizeStart={noop} onResizeReset={noop} />)).toBe("")
  })

  it("can mark the resize handle while the sidebar is being resized", () => {
    expect(viewMarkup(<SidebarResize open resizing onResizeStart={noop} onResizeReset={noop} />)).toContain('data-resizing="true"')
  })
})
