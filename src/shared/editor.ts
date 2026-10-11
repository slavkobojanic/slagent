// Editor settings the app owns. Everything else lives in the workbench itself.
export type EditorPrefs = {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
}

export const EDITOR_FONT_SIZE = { min: 8, max: 32 }
export const EDITOR_TAB_SIZE = { min: 1, max: 8 }

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
}
