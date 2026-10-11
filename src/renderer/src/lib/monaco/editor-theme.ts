export type EditorThemeType = "dark" | "light"

// The shape of a VS Code colour theme file. The editor loads it as a contributed theme.
export type EditorThemeJson = {
  name: string
  type: EditorThemeType
  colors: Record<string, string>
  tokenColors: { scope: string[]; settings: { foreground?: string; fontStyle?: string } }[]
}

// Adds an alpha channel to a #rgb or #rrggbb colour. VS Code themes take #rrggbbaa, and var() and
// color-mix() mean nothing to them, so translucent surfaces are built from resolved hex tokens.
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return hex
  const digits = match[1] ?? ""
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
  return `#${full}${channel.toString(16).padStart(2, "0")}`
}

export const THEME_NAMES: Record<EditorThemeType, string> = {
  dark: "Slagent Dark",
  light: "Slagent Light",
}

// Builds the editor theme from the app's theme tokens, as the browser computed them, so the
// editor follows the same palette as the rest of the interface in both modes.
export function editorTheme(type: EditorThemeType, read: (token: string) => string): EditorThemeJson {
  const background = read("--background")
  const foreground = read("--foreground")
  const muted = read("--muted-foreground")
  const popover = read("--popover")
  const accent = read("--accent")
  const border = withAlpha(foreground, 0.14)
  const selection = read("--terminal-selection")
  const soft = withAlpha(foreground, 0.08)
  const slider = withAlpha(foreground, 0.2)

  return {
    name: THEME_NAMES[type],
    type,
    colors: {
      "editor.background": background,
      "editor.foreground": foreground,
      "editorCursor.foreground": foreground,
      "editor.selectionBackground": selection,
      "editor.inactiveSelectionBackground": soft,
      "editor.selectionHighlightBackground": soft,
      "editor.wordHighlightBackground": soft,
      "editor.findMatchBackground": withAlpha(read("--warning"), 0.35),
      "editor.findMatchHighlightBackground": withAlpha(read("--warning"), 0.18),
      "editor.lineHighlightBackground": accent,
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": muted,
      "editorLineNumber.activeForeground": foreground,
      "editorGutter.background": background,
      "editorIndentGuide.background1": soft,
      "editorIndentGuide.activeBackground1": border,
      "editorWhitespace.foreground": soft,
      "editorBracketMatch.background": soft,
      "editorBracketMatch.border": border,
      "editorOverviewRuler.border": "#00000000",
      "editorWidget.background": popover,
      "editorWidget.foreground": foreground,
      "editorWidget.border": border,
      "editorSuggestWidget.background": popover,
      "editorSuggestWidget.border": border,
      "editorSuggestWidget.selectedBackground": accent,
      "editorHoverWidget.background": popover,
      "editorHoverWidget.border": border,
      "input.background": background,
      "input.foreground": foreground,
      "input.border": border,
      "focusBorder": withAlpha(read("--ring"), 0.4),
      "scrollbarSlider.background": slider,
      "scrollbarSlider.hoverBackground": withAlpha(foreground, 0.3),
      "scrollbarSlider.activeBackground": withAlpha(foreground, 0.4),
      "minimap.background": background,
      "diffEditor.insertedTextBackground": withAlpha(read("--success"), 0.18),
      "diffEditor.removedTextBackground": withAlpha(read("--destructive"), 0.18),
      "statusBar.background": background,
      "statusBar.foreground": muted,
      "statusBar.border": border,
      "statusBarItem.hoverBackground": accent,
      "list.hoverBackground": accent,
      "list.activeSelectionBackground": accent,
      "list.activeSelectionForeground": foreground,
      "list.focusBackground": accent,
      "descriptionForeground": muted,
      "errorForeground": read("--destructive"),
      "editorError.foreground": read("--destructive"),
      "editorWarning.foreground": read("--warning"),
      "editorInfo.foreground": read("--info"),
    },
    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: read("--terminal-bright-black"), fontStyle: "italic" } },
      { scope: ["keyword", "storage", "storage.type", "keyword.control"], settings: { foreground: read("--terminal-magenta") } },
      { scope: ["string", "string.quoted", "punctuation.definition.string"], settings: { foreground: read("--terminal-green") } },
      { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other"], settings: { foreground: read("--terminal-yellow") } },
      { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: read("--terminal-blue") } },
      { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class"], settings: { foreground: read("--terminal-cyan") } },
      { scope: ["entity.name.tag", "markup.deleted"], settings: { foreground: read("--terminal-red") } },
      { scope: ["entity.other.attribute-name", "variable.parameter"], settings: { foreground: read("--terminal-yellow") } },
      { scope: ["variable.other.property", "support.type.property-name", "meta.object-literal.key"], settings: { foreground: read("--terminal-bright-blue") } },
      { scope: ["keyword.operator", "punctuation"], settings: { foreground: muted } },
      { scope: ["markup.inserted"], settings: { foreground: read("--terminal-green") } },
      { scope: ["markup.heading", "markup.bold"], settings: { foreground: read("--terminal-blue"), fontStyle: "bold" } },
      { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
      { scope: ["invalid"], settings: { foreground: read("--destructive") } },
    ],
  }
}
