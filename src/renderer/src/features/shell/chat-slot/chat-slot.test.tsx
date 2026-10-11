import type { ComponentType } from "react"
import { describe, expect, it, vi } from "vitest"
import { ChatSlot, type ChatSlotProps } from "@/features/shell/chat-slot/chat-slot"
import { viewMarkup } from "@/test/view-markup"

const MainColumn: ComponentType = function MainColumn() {
  return <main>chat</main>
}

const base: ChatSlotProps = {
  editorMode: false,
  width: 480,
  resizing: false,
  MainColumn,
  onResizeStart: vi.fn(),
  onResizeReset: vi.fn(),
}

describe("ChatSlot", () => {
  it("can fill the centre in chat mode with no resize handle", () => {
    const markup = viewMarkup(<ChatSlot {...base} />)

    expect(markup).toContain("flex-1")
    expect(markup).toContain("<main>chat</main>")
    expect(markup).not.toContain('role="separator"')
    expect(markup).not.toContain("width:")
  })

  it("can dock to the right at the panel width in editor mode", () => {
    const markup = viewMarkup(<ChatSlot {...base} editorMode />)

    expect(markup).toContain("order-3")
    expect(markup).toContain("width: 480px")
    expect(markup).toContain("<main>chat</main>")
  })

  it("can offer a resize handle in editor mode", () => {
    expect(viewMarkup(<ChatSlot {...base} editorMode />)).toContain('role="separator"')
  })
})
