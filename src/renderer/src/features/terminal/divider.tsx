import type { PointerEvent as ReactPointerEvent } from "react"

export type DividerProps = {
  groupId: string
  onDividerStart: (groupId: string, event: ReactPointerEvent) => void
}

export function Divider({ groupId, onDividerStart }: DividerProps) {
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
