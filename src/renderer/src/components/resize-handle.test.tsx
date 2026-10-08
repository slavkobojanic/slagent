import { describe, expect, it } from "vitest"
import { ResizeHandle } from "@/components/resize-handle"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("ResizeHandle", () => {
  it("can sit on the right edge of the sidebar when given the sidebar edge", () => {
    const markup = viewMarkup(<ResizeHandle edge="sidebar" resizing={false} onResizeStart={noop} onResizeReset={noop} />)

    expect(markup).toContain('aria-label="Resize sidebar"')
    expect(markup).toContain("right-0")
  })

  it("can sit on the left edge of the side panel when given the diff edge", () => {
    const markup = viewMarkup(<ResizeHandle edge="diff" resizing={false} onResizeStart={noop} onResizeReset={noop} />)

    expect(markup).toContain('aria-label="Resize side panel"')
    expect(markup).toContain("left-0")
  })

  it("can sit on the top edge of the terminal drawer when given the terminal edge", () => {
    const markup = viewMarkup(<ResizeHandle edge="terminal" resizing={false} onResizeStart={noop} onResizeReset={noop} />)

    expect(markup).toContain('aria-label="Resize terminal"')
    expect(markup).toContain('aria-orientation="horizontal"')
    expect(markup).toContain("cursor-row-resize")
  })

  it("can mark itself as resizing while a drag runs", () => {
    const markup = viewMarkup(<ResizeHandle edge="sidebar" resizing onResizeStart={noop} onResizeReset={noop} />)

    expect(markup).toContain('data-resizing="true"')
  })
})
