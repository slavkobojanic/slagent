import type { EditorPrefs } from "@shared/editor"

export type EditorViewOptions = Pick<EditorPrefs, "fontSize" | "tabSize" | "wordWrap" | "minimap"> & { fontFamily: string }

export type EditorThemeMode = "dark" | "light"

export type EditorEvents = {
  onChange: (path: string) => void
  onSave: (path: string) => void
  onClose: (path: string) => void
}

// One mounted editor widget. Files are keyed by absolute path. Their models belong to the runtime,
// so unsaved edits and undo history outlive the widget and come back when it is mounted again.
export type EditorHandle = {
  open: (path: string, contents: string) => void
  show: (path: string) => void
  close: (path: string) => void
  read: (path: string) => string | null
  replace: (path: string, contents: string) => void
  focus: () => void
  dispose: () => void
}

// The VS Code powered editor behind a port, so presenters and tests never load Monaco.
export type EditorRuntime = {
  mount: (host: HTMLElement, events: EditorEvents, options: EditorViewOptions) => EditorHandle
  setOptions: (options: EditorViewOptions) => void
  // Only the active mode's theme tokens can be read, so each mode's theme JSON is supplied the
  // first time that mode is shown.
  setTheme: (mode: EditorThemeMode, themeJson: string) => Promise<void>
  // Loads each pack's grammars once. A pack switched off only stops loading on the next launch.
  loadPacks: (ids: string[]) => Promise<void>
}

export type LoadEditorRuntime = () => Promise<EditorRuntime>
