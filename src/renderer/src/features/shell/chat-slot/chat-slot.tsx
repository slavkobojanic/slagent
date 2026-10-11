import type { ComponentType, CSSProperties } from "react"
import { ResizeHandle } from "@/components/resize-handle"
import { cn } from "@/lib/utils"

export type ChatSlotProps = {
  editorMode: boolean
  width: number
  resizing: boolean
  MainColumn: ComponentType
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

// The chat keeps one place in the tree in both modes, so the transcript and composer are not
// remounted when the editor opens. Editor mode only changes how the slot is sized and ordered.
export function ChatSlot({ editorMode, width, resizing, MainColumn, onResizeStart, onResizeReset }: ChatSlotProps) {
  const style: CSSProperties | undefined = editorMode ? { width } : undefined
  return (
    <div className={cn("flex min-w-0", editorMode ? "relative order-3 shrink-0 border-l border-white/10" : "flex-1")} style={style}>
      {editorMode ? <ResizeHandle edge="diff" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} /> : null}
      <MainColumn />
    </div>
  )
}
