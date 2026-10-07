import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import { PanelFrame } from "./panel-frame"

export function createPanelFrame({
  Changes,
  metaStore,
  layoutStore,
  panelStore,
}: {
  Changes: ComponentType
  metaStore: MetaStore
  layoutStore: LayoutStore
  panelStore: PanelStore
}): ComponentType {
  return observer(function PanelFrameHost() {
    return (
      <PanelFrame
        open={panelStore.open}
        width={layoutStore.diffWidth}
        resizing={layoutStore.resizing === "diff"}
        visible={(metaStore.meta?.cwd ?? "") !== ""}
        Changes={Changes}
      />
    )
  })
}
