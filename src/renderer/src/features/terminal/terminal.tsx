import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from "react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { ResizeHandle } from "@/components/resize-handle"
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

type PaneProps = {
  pane: TerminalPane
  previous: TerminalPane | undefined
  share: string | undefined
  onSelect: (id: string) => void
  onMenuSplit: (id: string) => void
  onMenuRename: (id: string) => void
  onMenuClose: (id: string) => void
  onDividerStart: (groupId: string, event: ReactPointerEvent) => void
}

function Pane({ pane, previous, share, onSelect, onMenuSplit, onMenuRename, onMenuClose, onDividerStart }: PaneProps) {
  const grouped = pane.groupId !== null && previous !== undefined && previous.groupId === pane.groupId
  return (
    <>
      {grouped && previous !== undefined ? <Divider groupId={pane.groupId ?? ""} onDividerStart={onDividerStart} /> : null}
      <div
        data-pane={pane.id}
        className="relative h-full min-h-0 min-w-0"
        style={share === undefined ? { flex: "1 1 0%" } : { flex: `0 0 ${share}` }}
        onPointerDown={() => onSelect(pane.id)}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="h-full min-h-0">{pane.surface}</div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => onMenuSplit(pane.id)}>Split right</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onMenuRename(pane.id)}>Rename</ContextMenuItem>
            <ContextMenuItem variant="destructive" onSelect={() => onMenuClose(pane.id)}>
              Close
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </>
  )
}

function Divider({ groupId, onDividerStart }: { groupId: string; onDividerStart: (groupId: string, event: ReactPointerEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize split"
      title="Drag to resize"
      onPointerDown={(event) => onDividerStart(groupId, event)}
      className="group relative z-10 w-px shrink-0 cursor-col-resize touch-none bg-white/10 before:absolute before:inset-y-0 before:-left-1 before:-right-1 before:content-[''] hover:bg-white/25"
    />
  )
}
