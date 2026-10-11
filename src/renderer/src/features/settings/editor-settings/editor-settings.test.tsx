import { describe, expect, it, vi } from "vitest"
import { EditorSettings, type EditorSettingsProps } from "@/features/settings/editor-settings/editor-settings"
import { viewMarkup } from "@/test/view-markup"

const base: EditorSettingsProps = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  error: null,
  onFontSize: vi.fn(),
  onTabSize: vi.fn(),
  onWordWrap: vi.fn(),
  onMinimap: vi.fn(),
}

describe("EditorSettings", () => {
  it("can show the font and tab sizes", () => {
    const markup = viewMarkup(<EditorSettings {...base} fontSize={15} tabSize={4} />)

    expect(markup).toMatch(/id="editor-font-size"[^>]*value="15"/)
    expect(markup).toMatch(/id="editor-tab-size"[^>]*value="4"/)
  })

  it("can show word wrap and minimap switches off", () => {
    const markup = viewMarkup(<EditorSettings {...base} />)

    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Word wrap"/)
    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Minimap"/)
  })

  it("can show word wrap on", () => {
    expect(viewMarkup(<EditorSettings {...base} wordWrap />)).toMatch(/aria-checked="true"[^>]*aria-label="Word wrap"/)
  })

  it("can point to the editor's own Extensions view", () => {
    expect(viewMarkup(<EditorSettings {...base} />)).toContain("Extensions view")
  })

  it("can show a save error", () => {
    const markup = viewMarkup(<EditorSettings {...base} error="offline" />)

    expect(markup).toContain("offline")
    expect(markup).toContain('role="alert"')
  })
})
