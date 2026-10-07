import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { SidebarFrame } from "./sidebar-frame"

export function createSidebarFrame({ Library, layoutStore }: { Library: ComponentType; layoutStore: LayoutStore }): ComponentType {
  return observer(function SidebarFrameHost() {
    return (
      <SidebarFrame
        open={layoutStore.sidebarOpen}
        width={layoutStore.sidebarWidth}
        resizing={layoutStore.resizing === "sidebar"}
        Library={Library}
      />
    )
  })
}
