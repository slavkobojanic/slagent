import { ResizeHandle } from "@/components/resize-handle"

export type SidebarResizeProps = {
  open: boolean
  resizing: boolean
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

export function SidebarResize({ open, resizing, onResizeStart, onResizeReset }: SidebarResizeProps) {
  if (!open) {
    return null
  }
  return <ResizeHandle edge="sidebar" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} />
}
