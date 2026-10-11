import type { ComponentType } from "react"
import { describe, expect, it } from "vitest"
import { EditorFrame } from "@/features/shell/editor-frame/editor-frame"
import { viewMarkup } from "@/test/view-markup"

const Editor: ComponentType = function Editor() {
  return <section>editor</section>
}

describe("EditorFrame", () => {
  it("can render nothing in chat mode so the editor is never created", () => {
    expect(viewMarkup(<EditorFrame editorMode={false} Editor={Editor} />)).toBe("")
  })

  it("can render the editor in the centre in editor mode", () => {
    const markup = viewMarkup(<EditorFrame editorMode Editor={Editor} />)

    expect(markup).toContain("<section>editor</section>")
    expect(markup).toContain("order-2")
  })
})
