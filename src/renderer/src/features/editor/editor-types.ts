// What the user decided about a tab that is closing with unsaved edits.
export type CloseChoice = "save" | "discard" | "cancel"

export type EditorStatus = "idle" | "loading" | "ready" | "failed"

// What sits above the editor, most urgent first.
export type EditorBanner =
  | { kind: "closing"; name: string }
  | { kind: "conflict"; name: string }
  | { kind: "error"; message: string }
  | { kind: "notice"; message: string }

export type EditorTabItem = {
  absolutePath: string
  path: string
  name: string
  dirty: boolean
}
