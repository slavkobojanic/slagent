import type { ComponentType, CSSProperties } from "react"

export type SidebarFrameProps = {
  open: boolean
  width: number
  resizing: boolean
  Library: ComponentType
}

export function SidebarFrame({ open, width, resizing, Library }: SidebarFrameProps) {
  return (
    <div
      className="sidebar-slot"
      data-closed={open ? undefined : true}
      data-resizing={resizing ? true : undefined}
      inert={open ? undefined : true}
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
    >
      <Library />
    </div>
  )
}
