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

    expect(markup).toContain('class="chat-slot"')
    expect(markup).not.toContain("data-editor-mode")
    expect(markup).toContain("<main>chat</main>")
    expect(markup).not.toContain('role="separator"')
  })

  it("can dock to the right at the panel width in editor mode", () => {
    const markup = viewMarkup(<ChatSlot {...base} editorMode />)

    expect(markup).toContain('data-editor-mode="true"')
    expect(markup).toContain("--chat-docked-width: 480px")
    expect(markup).toContain("<main>chat</main>")
  })

  it("can offer a resize handle in editor mode", () => {
    expect(viewMarkup(<ChatSlot {...base} editorMode />)).toContain('role="separator"')
  })
})
