import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { EditorFrame } from "@/features/shell/editor-frame/editor-frame"
import { viewMarkup } from "@/test/view-markup"

const Editor: ComponentType = function Editor() {
  return <section>editor</section>
}

describe("EditorFrame", () => {
  it("can render nothing until the editor has been opened", () => {
    expect(viewMarkup(<EditorFrame editorMode={false} editorOpened={false} Editor={Editor} />)).toBe("")
  })

  it("can render the editor in the centre in editor mode", () => {
    const markup = viewMarkup(<EditorFrame editorMode editorOpened Editor={Editor} />)

    expect(markup).toContain("<section>editor</section>")
    expect(markup).toContain('class="editor-slot"')
    expect(markup).toContain('data-editor-mode="true"')
  })

  it("can keep the editor mounted but hidden after going back to the chat", () => {
    const markup = viewMarkup(<EditorFrame editorMode={false} editorOpened Editor={Editor} />)

    expect(markup).toContain("<section>editor</section>")
    expect(markup).toContain('class="editor-slot"')
    expect(markup).not.toContain("data-editor-mode")
  })
})
