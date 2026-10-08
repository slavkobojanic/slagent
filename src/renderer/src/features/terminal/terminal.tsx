import type { CSSProperties, ReactElement } from "react"
import { Plus, TerminalSquare, X } from "lucide-react"
import { ResizeHandle } from "@/components/resize-handle"
import { Button } from "@/components/ui/button"
import "./terminal.css"

export type TerminalProps = {
  open: boolean
  height: number
  resizing: boolean
  tabs: ReactElement[]
  surfaces: ReactElement[]
  empty: boolean
  error: string | null
  canCreate: boolean
  onCreate: () => void
  onClose: () => void
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

export function Terminal({ open, height, resizing, tabs, surfaces, empty, error, canCreate, onCreate, onClose, onResizeStart, onResizeReset }: TerminalProps) {
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
        <header className="flex h-8 shrink-0 items-center gap-1 border-b border-white/10 px-2">
          <TerminalSquare className="size-3.5 shrink-0 text-white/40" />
          <div className="terminal-tabs flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">{tabs}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label="New terminal tab"
            title="New terminal tab"
            disabled={!canCreate}
            onClick={onCreate}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0" aria-label="Hide terminal" title="Hide terminal" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </header>
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
