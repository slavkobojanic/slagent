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
  // The slot collapses whenever its content is gone, not just when the panel is closed:
  // with the editor open the changes are unmounted, and a collapsed track stops the
  // editor-mode swap from leaving an empty hole where the panel used to be.
  const collapsed = !open || !visible
  return (
    <div
      className="panel-slot"
      data-closed={collapsed ? true : undefined}
      data-resizing={resizing ? true : undefined}
      inert={open ? undefined : true}
      style={{ "--panel-width": `${width}px` } as CSSProperties}
    >
      {visible ? <Changes /> : null}
    </div>
  )
}
