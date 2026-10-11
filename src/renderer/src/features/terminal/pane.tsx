import type { PointerEvent as ReactPointerEvent } from "react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Divider } from "./divider"
import type { TerminalPane } from "./terminal"

export type PaneProps = {
  pane: TerminalPane
  previous: TerminalPane | undefined
  share: string | undefined
  onSelect: (id: string) => void
  onMenuSplit: (id: string) => void
  onMenuRename: (id: string) => void
  onMenuClose: (id: string) => void
  onDividerStart: (groupId: string, event: ReactPointerEvent) => void
}

export function Pane({ pane, previous, share, onSelect, onMenuSplit, onMenuRename, onMenuClose, onDividerStart }: PaneProps) {
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
