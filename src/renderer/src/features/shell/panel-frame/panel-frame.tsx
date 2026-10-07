import type { ComponentType, CSSProperties } from "react"

export type PanelFrameProps = {
  open: boolean
  width: number
  resizing: boolean
  // The panel only exists once a folder is open.
  visible: boolean
  Changes: ComponentType
}

export function PanelFrame({ open, width, resizing, visible, Changes }: PanelFrameProps) {
  return (
    <div
      className="panel-slot"
      data-closed={open ? undefined : true}
      data-resizing={resizing ? true : undefined}
      inert={open ? undefined : true}
      style={{ "--panel-width": `${width}px` } as CSSProperties}
    >
      {visible ? <Changes /> : null}
    </div>
  )
}
