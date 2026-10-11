import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export type EditorFrameProps = {
  editorMode: boolean
  // True once the editor has been opened. Its frame then stays mounted, hidden, so going back to the
  // chat keeps its tabs and does not start a new workbench session.
  editorOpened: boolean
  Editor: ComponentType
}

export function EditorFrame({ editorMode, editorOpened, Editor }: EditorFrameProps) {
  if (!editorOpened) {
    return null
  }
  return (
    <div className={cn("order-2 flex min-w-0 flex-1", !editorMode && "hidden")}>
      <Editor />
    </div>
  )
}
