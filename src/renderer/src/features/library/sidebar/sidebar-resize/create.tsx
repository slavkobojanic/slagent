import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { SidebarResize } from "./sidebar-resize"

export function createSidebarResize({ layoutStore, layoutPresenter }: { layoutStore: LayoutStore; layoutPresenter: LayoutPresenter }): ComponentType {
  const handleResizeStart = (event: PointerEvent) => {
    layoutPresenter.handleResizeStart("sidebar", event)
  }
  const handleResizeReset = () => {
    layoutPresenter.handleResizeReset("sidebar")
  }

  return observer(function SidebarResizeHost() {
    return (
      <SidebarResize
        open={layoutStore.sidebarOpen}
        resizing={layoutStore.resizing === "sidebar"}
        onResizeStart={handleResizeStart}
        onResizeReset={handleResizeReset}
      />
    )
  })
}
