import type { ComponentType } from "react"
import { ResizeHandle } from "@/components/resize-handle"

export type ChangesProps = {
  resizing: boolean
  showing: "changes" | "plan"
  Tabs: ComponentType
  DiffPanel: ComponentType
  PlanDocument: ComponentType
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

export function Changes({ resizing, showing, Tabs, DiffPanel, PlanDocument, onResizeStart, onResizeReset }: ChangesProps) {
  return (
    <aside className="relative flex h-full shrink-0 flex-col border-l border-white/10" aria-label="Side panel">
      <ResizeHandle edge="diff" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} />
      <Tabs />
      {showing === "plan" ? <PlanDocument /> : <DiffPanel />}
    </aside>
  )
}
