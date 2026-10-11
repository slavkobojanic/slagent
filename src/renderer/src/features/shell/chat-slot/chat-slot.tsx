import type { ComponentType, CSSProperties } from "react"
import { ResizeHandle } from "@/components/resize-handle"

export type ChatSlotProps = {
  editorMode: boolean
  width: number
  resizing: boolean
  MainColumn: ComponentType
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

// The chat keeps one place in the tree in both modes, so the transcript and composer are
// not remounted when the editor opens. Editor mode only swaps which pane takes the space:
// .chat-slot in shell.css docks the chat by dropping its flex-grow, so the swap animates.
export function ChatSlot({ editorMode, width, resizing, MainColumn, onResizeStart, onResizeReset }: ChatSlotProps) {
  return (
    <div
      className="chat-slot"
      data-editor-mode={editorMode ? true : undefined}
      style={{ "--chat-docked-width": `${width}px` } as CSSProperties}
    >
      {editorMode ? <ResizeHandle edge="diff" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} /> : null}
      <MainColumn />
    </div>
  )
}
