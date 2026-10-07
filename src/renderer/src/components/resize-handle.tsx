import { cn } from "@/lib/utils"

export type ResizeHandleProps = {
  edge: "sidebar" | "diff"
  resizing: boolean
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

export function ResizeHandle({ edge, resizing, onResizeStart, onResizeReset }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={edge === "sidebar" ? "Resize sidebar" : "Resize side panel"}
      title="Drag to resize, double-click to reset"
      data-resizing={resizing || undefined}
      onPointerDown={(event) => onResizeStart(event.nativeEvent)}
      onDoubleClick={onResizeReset}
      className={cn(
        "group absolute inset-y-0 z-30 w-2 cursor-col-resize touch-none",
        edge === "sidebar" ? "right-0" : "left-0",
      )}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-foreground/35 group-data-[resizing]:bg-foreground/35" />
    </div>
  )
}
