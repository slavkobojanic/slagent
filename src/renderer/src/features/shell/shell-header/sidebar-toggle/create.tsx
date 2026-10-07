import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { modKey } from "@/lib/format"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { SidebarToggle } from "./sidebar-toggle"
import { sidebarToggleTitle } from "./sidebar-toggle-utils"

export function createSidebarToggle({
  api,
  layoutStore,
  layoutPresenter,
  commandRegistry,
}: {
  api: API
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  commandRegistry: CommandRegistry
}): ComponentType {
  const mod = modKey(api.platform)

  commandRegistry.register({
    id: "sidebar.toggle",
    label: "Toggle sidebar",
    group: "Actions",
    shortcut: { key: "b", mod: true },
    run: layoutPresenter.toggleSidebar,
  })

  return observer(function SidebarToggleHost() {
    const open = layoutStore.sidebarOpen
    return <SidebarToggle open={open} title={sidebarToggleTitle(open, mod)} onToggle={layoutPresenter.toggleSidebar} />
  })
}
