import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { JumpPort } from "@/state/jump-port/jump-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { createChatDeletion } from "./chat-deletion/create"
import { ChatDeletionStore } from "./chat-deletion/chat-deletion-store/chat-deletion-store"
import { ChatSwitchPresenter } from "./chat-switch/chat-switch-presenter/chat-switch-presenter"
import { createCommandPalette } from "./command-palette/create"
import { Library } from "./library"
import { NavHistoryPresenter } from "./nav-history/nav-history-presenter/nav-history-presenter"
import { NavHistoryStore } from "./nav-history/nav-history-store/nav-history-store"
import { createProjectRemoval } from "./project-removal/create"
import { ProjectRemovalStore } from "./project-removal/project-removal-store/project-removal-store"
import { createSidebar } from "./sidebar/create"

export function createLibrary({
  api,
  window,
  libraryStore,
  metaStore,
  runStore,
  layoutStore,
  layoutPresenter,
  overlayStore,
  panelPresenter,
  reviewPresenter,
  commandRegistry,
  composerPort,
  jumpPort,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  metaStore: MetaStore
  runStore: RunStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  overlayStore: OverlayStore
  panelPresenter: PanelPresenter
  reviewPresenter: ReviewPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  jumpPort: JumpPort
}): ComponentType {
  // Sidebar rows open the confirmations, so their stores live here, above both.
  const chatDeletionStore = new ChatDeletionStore()
  const projectRemovalStore = new ProjectRemovalStore()

  const Sidebar = createSidebar({
    api,
    window,
    libraryStore,
    layoutStore,
    layoutPresenter,
    commandRegistry,
    composerPort,
    jumpPort,
    chatDeletionStore,
    projectRemovalStore,
  })
  const ChatDeletion = createChatDeletion({ api, chatDeletionStore })
  const ProjectRemoval = createProjectRemoval({ api, projectRemovalStore })

  const navHistoryPresenter = new NavHistoryPresenter(new NavHistoryStore(), api, window, libraryStore, composerPort, commandRegistry)
  navHistoryPresenter.start()
  const chatSwitchPresenter = new ChatSwitchPresenter(libraryStore, panelPresenter, reviewPresenter)
  chatSwitchPresenter.start()

  const CommandPalette = createCommandPalette({ api, window, libraryStore, metaStore, runStore, overlayStore, commandRegistry, composerPort })

  return function LibraryHost() {
    return <Library Sidebar={Sidebar} ChatDeletion={ChatDeletion} ProjectRemoval={ProjectRemoval} CommandPalette={CommandPalette} />
  }
}
