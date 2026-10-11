import type { EditorPrefs } from "@shared/editor"

export type EditorViewOptions = Pick<EditorPrefs, "fontSize" | "tabSize" | "wordWrap" | "minimap"> & { fontFamily: string }

export type EditorThemeMode = "dark" | "light"

// Theme files for both modes as VS Code theme JSON text.
export type EditorThemes = Record<EditorThemeMode, string>

export type EditorEvents = {
  onChange: (path: string) => void
  onSave: (path: string) => void
  onClose: (path: string) => void
}

// One mounted editor. Files are keyed by absolute path; each keeps its own model, so undo history
// and the cursor survive switching tabs.
export type EditorHandle = {
  open: (path: string, contents: string) => void
  show: (path: string) => void
  close: (path: string) => void
  read: (path: string) => string | null
  focus: () => void
  dispose: () => void
}

// The VS Code powered editor behind a port, so presenters and tests never load Monaco.
export type EditorRuntime = {
  mount: (host: HTMLElement, events: EditorEvents, options: EditorViewOptions) => EditorHandle
  setOptions: (options: EditorViewOptions) => void
  setTheme: (themes: EditorThemes, mode: EditorThemeMode) => Promise<void>
  // Loads each pack's grammars once. A pack switched off only stops loading on the next launch.
  loadPacks: (ids: string[]) => Promise<void>
}

export type LoadEditorRuntime = () => Promise<EditorRuntime>
