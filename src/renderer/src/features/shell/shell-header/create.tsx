import type { ComponentType } from "react"
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
import { createChatTitle } from "./chat-title/create"
import { createModelButton } from "./model-button/create"
import { createPanelToggle } from "./panel-toggle/create"
import { createProjectMenu } from "./project-menu/create"
import type { ProjectMenuStore } from "./project-menu/project-menu-store/project-menu-store"
import { createSettingsButton } from "./settings-button/create"
import { ShellHeader } from "./shell-header"
import { createSidebarToggle } from "./sidebar-toggle/create"
import { createUpdateButton } from "./update-button/create"
import type { UpdateButtonStore } from "./update-button/update-button-store/update-button-store"

export function createShellHeader({
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
  log,
}: {
  api: API
  libraryStore: LibraryStore
  metaStore: MetaStore
  runStore: RunStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  overlayStore: OverlayStore
  mcpStore: McpStore
  commandRegistry: CommandRegistry
  projectMenuStore: ProjectMenuStore
  updateButtonStore: UpdateButtonStore
  log: Log
}): ComponentType {
  const SidebarToggle = createSidebarToggle({ api, layoutStore, layoutPresenter, commandRegistry })
  const ProjectMenu = createProjectMenu({ api, libraryStore, projectMenuStore, log: log.child("project-menu") })
  const ChatTitle = createChatTitle({ libraryStore })
  const UpdateButton = createUpdateButton({ api, updateButtonStore, log: log.child("update-button") })
  const ModelButton = createModelButton({ metaStore, runStore, overlayStore, log: log.child("model-button") })
  const PanelToggle = createPanelToggle({ api, metaStore, panelStore, panelPresenter, log: log.child("panel-toggle") })
  const SettingsButton = createSettingsButton({ mcpStore, overlayStore, log: log.child("settings-button") })
  const macos = api.platform === "darwin"

  return function ShellHeaderHost() {
    return (
      <ShellHeader
        macos={macos}
        SidebarToggle={SidebarToggle}
        ProjectMenu={ProjectMenu}
        ChatTitle={ChatTitle}
        UpdateButton={UpdateButton}
        ModelButton={ModelButton}
        PanelToggle={PanelToggle}
        SettingsButton={SettingsButton}
      />
    )
  }
}
