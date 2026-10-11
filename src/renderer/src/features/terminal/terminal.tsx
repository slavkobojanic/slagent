import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from "react"
import { ResizeHandle } from "@/components/resize-handle"
import { Pane } from "./pane"
import "./terminal.css"

export type TerminalPane = {
  id: string
  // Panes sharing a group sit side by side and share the group's divider ratio.
  groupId: string | null
  surface: ReactElement
}

export type TerminalProps = {
  open: boolean
  height: number
  resizing: boolean
  // The visible panes, in order; a group renders its members side by side.
  panes: TerminalPane[]
  // Tabs that are mounted but not in the visible group keep their scrollback.
  hiddenSurfaces: ReactElement[]
  splitRatio: (groupId: string) => number
  error: string | null
  onPaneSelect: (id: string) => void
  onMenuSplit: (id: string) => void
  onMenuRename: (id: string) => void
  onMenuClose: (id: string) => void
  onDividerStart: (groupId: string, event: ReactPointerEvent) => void
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

// The drawer's tab bar lives in the bottom bar, so the drawer shows the active
// tab's pane row: one shell full width, or a group's shells side by side.
export function Terminal({
  open,
  height,
  resizing,
  panes,
  hiddenSurfaces,
  splitRatio,
  error,
  onPaneSelect,
  onMenuSplit,
  onMenuRename,
  onMenuClose,
  onDividerStart,
  onResizeStart,
  onResizeReset,
}: TerminalProps) {
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
        <div className="relative min-h-0 flex-1">
          {body(panes, hiddenSurfaces, splitRatio, error, onPaneSelect, onMenuSplit, onMenuRename, onMenuClose, onDividerStart)}
        </div>
      </section>
    </div>
  )
}

function body(
  panes: TerminalPane[],
  hiddenSurfaces: ReactElement[],
  splitRatio: (groupId: string) => number,
  error: string | null,
  onPaneSelect: (id: string) => void,
  onMenuSplit: (id: string) => void,
  onMenuRename: (id: string) => void,
  onMenuClose: (id: string) => void,
  onDividerStart: (groupId: string, event: ReactPointerEvent) => void,
) {
  if (error !== null) {
    return (
      <p role="alert" className="px-3 py-2 text-xs text-destructive">
        {error}
      </p>
    )
  }
  if (panes.length === 0) {
    if (hiddenSurfaces.length > 0) {
      return <div className="absolute inset-0 overflow-hidden">{hiddenSurfaces}</div>
    }
    return <p className="px-3 py-2 text-xs text-muted-foreground">Starting a shell…</p>
  }
  return (
    <>
      {hiddenSurfaces.length > 0 ? <div className="absolute inset-0 overflow-hidden">{hiddenSurfaces}</div> : null}
      <div data-split-row className="flex h-full min-h-0">
        {panes.map((pane, index) => (
          <Pane
            key={pane.id}
            pane={pane}
            previous={panes[index - 1]}
            share={shareOf(pane, panes, splitRatio)}
            onSelect={onPaneSelect}
            onMenuSplit={onMenuSplit}
            onMenuRename={onMenuRename}
            onMenuClose={onMenuClose}
            onDividerStart={onDividerStart}
          />
        ))}
      </div>
    </>
  )
}

// The row's panes flex from the group's ratio: the first takes its share, the
// rest split what is left. A solo tab takes the whole row.
function shareOf(pane: TerminalPane, panes: TerminalPane[], splitRatio: (groupId: string) => number): string | undefined {
  const first = panes[0]
  if (pane.groupId === null || panes.length < 2 || first === undefined || first.id !== pane.id) {
    return undefined
  }
  return `${splitRatio(pane.groupId) * 100}%`
}

