import type { ComponentType } from "react"

export type EditorFrameProps = {
  editorMode: boolean
  // True once the editor has been opened. Its frame then stays mounted, hidden, so going back to the
  // chat keeps its tabs and does not start a new workbench session.
  editorOpened: boolean
  Editor: ComponentType
}

// .editor-slot in shell.css grows the editor into the centre while the chat docks; the
// frame only ever unmounts before the first open.
export function EditorFrame({ editorMode, editorOpened, Editor }: EditorFrameProps) {
  if (!editorOpened) {
    return null
  }
  return (
    <div className="editor-slot" data-editor-mode={editorMode ? true : undefined}>
      <Editor />
    </div>
  )
}
