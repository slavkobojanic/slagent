import { describe, expect, it } from "vitest"
import { editorTheme, THEME_NAMES, withAlpha, workbenchTheme } from "@/lib/editor-theme"

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

describe("workbenchTheme", () => {
  it("can pick the base theme for the mode", () => {
    expect(workbenchTheme("dark", tokenReader)["workbench.colorTheme"]).toBe("Dark Modern")
    expect(workbenchTheme("light", tokenReader)["workbench.colorTheme"]).toBe("Light Modern")
  })

  it("can carry our colours over the base theme", () => {
    const colors = workbenchTheme("dark", tokenReader)["workbench.colorCustomizations"] as Record<string, string>

    expect(colors["editor.background"]).toBe("#000000")
    expect(colors["sideBar.background"]).toBe("#000000")
    expect(colors["tab.activeBackground"]).toBe("value:--primary")
  })

  it("can carry our syntax colours as text mate rules", () => {
    const tokens = workbenchTheme("dark", tokenReader)["editor.tokenColorCustomizations"] as { textMateRules: { scope: string[] }[] }

    expect(tokens.textMateRules.some((rule) => rule.scope.includes("keyword"))).toBe(true)
  })

  it("can leave the chrome flat by clearing the tab borders", () => {
    const colors = workbenchTheme("dark", tokenReader)["workbench.colorCustomizations"] as Record<string, string>

    expect(colors["tab.border"]).toBe("#00000000")
  })
})

describe("workbenchTheme tabs", () => {
  it("can flatten the connected tab strip behind the tabs", () => {
    const colors = workbenchTheme("light", tokenReader)["workbench.colorCustomizations"] as Record<string, string>

    expect(colors["editorGroupHeader.connectedTabsBackground"]).toBe("#000000")
    expect(colors["tab.unfocusedInactiveBackground"]).toBe("value:--muted")
    expect(colors["tab.selectedBackground"]).toBe("value:--primary")
  })
})

describe("workbenchTheme tab colours", () => {
  const colors = () => workbenchTheme("light", tokenReader)["workbench.colorCustomizations"] as Record<string, string>

  it("can fill the selected tab with the primary colour and its text colour", () => {
    expect(colors()["tab.activeBackground"]).toBe("value:--primary")
    expect(colors()["tab.activeForeground"]).toBe("value:--primary-foreground")
  })

  it("can show other tabs light with the normal text colour", () => {
    expect(colors()["tab.inactiveBackground"]).toBe("value:--muted")
    expect(colors()["tab.inactiveForeground"]).toBe("#ffffff")
  })

  it("can keep the same look when the editor group is not focused", () => {
    expect(colors()["tab.unfocusedActiveBackground"]).toBe("value:--primary")
    expect(colors()["tab.unfocusedInactiveBackground"]).toBe("value:--muted")
  })
})

describe("workbenchTheme pill tabs", () => {
  const values = () => workbenchTheme("light", tokenReader)

  it("can ask for pill tabs", () => {
    expect(values()["workbench.experimental.modernUIEditorTabStyle"]).toBe("pill")
  })

  it("can fill the selected pill with the primary colour and the unselected ones with the muted colour", () => {
    const colors = values()["workbench.colorCustomizations"] as Record<string, string>

    expect(colors["modernEditorTab.activeBackground"]).toBe("value:--primary")
    expect(colors["modernEditorTab.activeForeground"]).toBe("value:--primary-foreground")
    expect(colors["modernEditorTab.inactiveBackground"]).toBe("value:--muted")
  })
})

