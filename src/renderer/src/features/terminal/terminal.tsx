import type { CSSProperties, ReactElement } from "react"
import { ResizeHandle } from "@/components/resize-handle"
import "./terminal.css"

export type TerminalProps = {
  open: boolean
  height: number
  resizing: boolean
  surfaces: ReactElement[]
  empty: boolean
  error: string | null
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

// The drawer's tab bar lives in the bottom bar, so the drawer only shows the
// active shell's surface.
export function Terminal({ open, height, resizing, surfaces, empty, error, onResizeStart, onResizeReset }: TerminalProps) {
  return (
    <div
      className="terminal-slot"
      data-closed={open ? undefined : true}
      data-resizing={resizing ? true : undefined}
      style={{ "--terminal-height": `${height}px` } as CSSProperties}
    >
      <section
        aria-label="Terminal"
        inert={open ? undefined : true}
        className="relative flex min-h-0 flex-col border-t border-white/10 bg-background"
      >
        <ResizeHandle edge="terminal" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} />
        <div className="relative min-h-0 flex-1">{body(empty, error, surfaces)}</div>
      </section>
    </div>
  )
}

function body(empty: boolean, error: string | null, surfaces: ReactElement[]) {
  if (error !== null) {
    return (
      <p role="alert" className="px-3 py-2 text-xs text-destructive">
        {error}
      </p>
    )
  }
  if (empty) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">Starting a shell…</p>
  }
  return surfaces
}
