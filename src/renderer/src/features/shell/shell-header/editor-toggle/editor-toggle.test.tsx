import { describe, expect, it } from "vitest"
import { EditorToggle, type EditorToggleProps } from "@/features/shell/shell-header/editor-toggle/editor-toggle"
import { viewMarkup } from "@/test/view-markup"

const base: EditorToggleProps = { on: false, disabled: false, onToggle: () => undefined }

describe("EditorToggle", () => {
  it("can offer to open the editor in chat mode", () => {
    const markup = viewMarkup(<EditorToggle {...base} />)

    expect(markup).toContain('aria-label="Open editor"')
    expect(markup).toContain('aria-pressed="false"')
  })

  it("can offer to go back to the chat in editor mode", () => {
    const markup = viewMarkup(<EditorToggle {...base} on />)

    expect(markup).toContain('aria-label="Back to chat"')
    expect(markup).toContain('aria-pressed="true"')
  })

  it("can disable the button until a folder is open", () => {
    expect(viewMarkup(<EditorToggle {...base} disabled />)).toContain('disabled=""')
  })
})
