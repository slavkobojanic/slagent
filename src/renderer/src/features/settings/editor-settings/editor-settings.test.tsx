import { describe, expect, it, vi } from "vitest"
import { EditorSettings, type EditorSettingsProps } from "@/features/settings/editor-settings/editor-settings"
import { viewMarkup } from "@/test/view-markup"

const base: EditorSettingsProps = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  packs: [
    { id: "json", label: "JSON", languages: "JSON, JSONC", enabled: true },
    { id: "java", label: "Java", languages: "Java", enabled: false },
  ],
  error: null,
  onFontSize: vi.fn(),
  onTabSize: vi.fn(),
  onWordWrap: vi.fn(),
  onMinimap: vi.fn(),
  onTogglePack: vi.fn(),
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

  it("can list each language pack with its state", () => {
    const markup = viewMarkup(<EditorSettings {...base} />)

    expect(markup).toMatch(/aria-checked="true"[^>]*aria-label="JSON"/)
    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Java"/)
  })

  it("can say a switched off pack takes effect on the next launch", () => {
    expect(viewMarkup(<EditorSettings {...base} />)).toContain("next time the app starts")
  })

  it("can show a save error", () => {
    const markup = viewMarkup(<EditorSettings {...base} error="offline" />)

    expect(markup).toContain("offline")
    expect(markup).toContain('role="alert"')
  })
})
