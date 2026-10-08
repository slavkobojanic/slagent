import { cn } from "@/lib/utils"

export type ResizeHandleProps = {
  edge: "sidebar" | "diff" | "terminal"
  resizing: boolean
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

const LABELS = {
  sidebar: "Resize sidebar",
  diff: "Resize side panel",
  terminal: "Resize terminal",
} as const

const EDGES = {
  sidebar: "right-0",
  diff: "left-0",
  terminal: "top-0",
} as const

export function ResizeHandle({ edge, resizing, onResizeStart, onResizeReset }: ResizeHandleProps) {
  const horizontal = edge === "terminal"
  return (
    <div
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-label={LABELS[edge]}
      title="Drag to resize, double-click to reset"
      data-resizing={resizing || undefined}
      onPointerDown={(event) => onResizeStart(event.nativeEvent)}
      onDoubleClick={onResizeReset}
      className={cn(
        "group absolute z-30 touch-none",
        horizontal ? "inset-x-0 h-2 cursor-row-resize" : "inset-y-0 w-2 cursor-col-resize",
        EDGES[edge],
      )}
    >
      <span
        className={cn(
          "absolute bg-transparent transition-colors duration-150 group-hover:bg-foreground/35 group-data-[resizing]:bg-foreground/35",
          horizontal ? "inset-x-0 top-1/2 h-px -translate-y-1/2" : "inset-y-0 left-1/2 w-px -translate-x-1/2",
        )}
      />
    </div>
  )
}
