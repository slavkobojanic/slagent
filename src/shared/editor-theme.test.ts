import { describe, expect, it } from "vitest"
import { editorTheme, THEME_NAMES, withAlpha } from "./editor-theme"

function tokenReader(token: string): string {
  const fixed: Record<string, string> = { "--foreground": "#ffffff", "--background": "#000000" }
  return fixed[token] ?? `value:${token}`
}

describe("withAlpha", () => {
  it("can add an alpha channel to a six digit colour", () => {
    expect(withAlpha("#ffffff", 0.14)).toBe("#ffffff24")
  })

  it("can expand a three digit colour", () => {
    expect(withAlpha("#fa0", 1)).toBe("#ffaa00ff")
  })

  it("can clamp the alpha into range", () => {
    expect(withAlpha("#000000", -1)).toBe("#00000000")
    expect(withAlpha("#000000", 4)).toBe("#000000ff")
  })

  it("can leave a colour it cannot parse alone", () => {
    expect(withAlpha("rgba(0, 0, 0, 0.14)", 0.5)).toBe("rgba(0, 0, 0, 0.14)")
  })
})

describe("editorTheme", () => {
  it("can name the theme for its mode", () => {
    expect(editorTheme("dark", tokenReader).name).toBe(THEME_NAMES.dark)
    expect(editorTheme("light", tokenReader).name).toBe(THEME_NAMES.light)
  })

  it("can carry the mode so the editor picks matching base colours", () => {
    expect(editorTheme("light", tokenReader).type).toBe("light")
  })

  it("can take the surface from the background and foreground tokens", () => {
    const { colors } = editorTheme("dark", tokenReader)

    expect(colors["editor.background"]).toBe("#000000")
    expect(colors["editor.foreground"]).toBe("#ffffff")
    expect(colors["editorCursor.foreground"]).toBe("#ffffff")
  })

  it("can take popups from the popover token", () => {
    expect(editorTheme("dark", tokenReader).colors["editorWidget.background"]).toBe("value:--popover")
  })

  it("can build borders from the foreground instead of the color-mix border token", () => {
    expect(editorTheme("dark", tokenReader).colors["editorWidget.border"]).toBe("#ffffff24")
  })

  it("can take syntax colours from the terminal palette", () => {
    const { tokenColors } = editorTheme("dark", tokenReader)
    const keyword = tokenColors.find((rule) => rule.scope.includes("keyword"))
    const string = tokenColors.find((rule) => rule.scope.includes("string"))

    expect(keyword?.settings.foreground).toBe("value:--terminal-magenta")
    expect(string?.settings.foreground).toBe("value:--terminal-green")
  })

  it("can italicise comments", () => {
    const comment = editorTheme("dark", tokenReader).tokenColors.find((rule) => rule.scope.includes("comment"))

    expect(comment?.settings.fontStyle).toBe("italic")
  })
})
