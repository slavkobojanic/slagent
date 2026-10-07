import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"
import { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"
import { UpdateButtonStore } from "@/features/shell/shell-header/update-button/update-button-store/update-button-store"
import { createMainColumn } from "./main-column/create"
import { createPanelFrame } from "./panel-frame/create"
import { Shell } from "./shell"
import { createShellHeader } from "./shell-header/create"
import { createSidebarFrame } from "./sidebar-frame/create"

export function createShell({
  Library,
  Settings,
  Models,
  Transcript,
  Composer,
  Changes,
  PlanOverlay,
  api,
  libraryStore,
  metaStore,
  runStore,
  layoutStore,
  layoutPresenter,
  panelStore,
  panelPresenter,
  overlayStore,
  permissionsStore,
  mcpStore,
  commandRegistry,
  log,
}: {
  Library: ComponentType
  Settings: ComponentType
  Models: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  Changes: ComponentType
  PlanOverlay: ComponentType
  api: API
  libraryStore: LibraryStore
  metaStore: MetaStore
  runStore: RunStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  overlayStore: OverlayStore
  permissionsStore: PermissionsStore
  mcpStore: McpStore
  commandRegistry: CommandRegistry
  log: Log
}): ComponentType {
  // The header owns these, but their errors show above the transcript in the main column.
  const projectMenuStore = new ProjectMenuStore()
  const updateButtonStore = new UpdateButtonStore()

  const Header = createShellHeader({
    api,
    libraryStore,
    metaStore,
    runStore,
    layoutStore,
    layoutPresenter,
    panelStore,
    panelPresenter,
    overlayStore,
    mcpStore,
    commandRegistry,
    projectMenuStore,
    updateButtonStore,
    log: log.child("shell-header"),
  })
  const SidebarFrame = createSidebarFrame({ Library, layoutStore })
  const MainColumn = createMainColumn({ Transcript, Composer, PlanOverlay, metaStore, projectMenuStore, updateButtonStore })
  const PanelFrame = createPanelFrame({ Changes, metaStore, layoutStore, panelStore })

  return observer(function ShellHost() {
    return (
      <Shell
        inert={permissionsStore.locked}
        Header={Header}
        SidebarFrame={SidebarFrame}
        MainColumn={MainColumn}
        PanelFrame={PanelFrame}
        Settings={Settings}
        Models={Models}
      />
    )
  })
}
