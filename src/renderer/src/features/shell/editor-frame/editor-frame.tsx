import type { ComponentType } from "react"

export type EditorFrameProps = {
  editorMode: boolean
  Editor: ComponentType
}

// Only mounted in editor mode, so Monaco is never created for someone who just chats.
export function EditorFrame({ editorMode, Editor }: EditorFrameProps) {
  if (!editorMode) {
    return null
  }
  return (
    <div className="order-2 flex min-w-0 flex-1">
      <Editor />
    </div>
  )
}
