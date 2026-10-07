import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { JumpPort } from "@/state/jump-port/jump-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { ChatSearchPresenter } from "./chat-search/chat-search-presenter/chat-search-presenter"
import { ChatSearchStore } from "./chat-search/chat-search-store/chat-search-store"
import { createSearchBox } from "./chat-search/search-box/create"
import { createSearchResults } from "./chat-search/search-results/create"
import { createOpenProject } from "./open-project/create"
import { createPinnedProjects } from "./pinned-projects/create"
import { createProjectRow } from "./project-row/create"
import { Sidebar } from "./sidebar"
import { createSidebarResize } from "./sidebar-resize/create"

export function createSidebar({
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
  chatSwitchPresenter,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  jumpPort: JumpPort
  chatDeletionStore: ChatDeletionStore
  projectRemovalStore: ProjectRemovalStore
  chatSwitchPresenter: ChatSwitchPresenter
  log: Log
}): ComponentType {
  // The palette lists commands in registration order: new chat, open folder, then search.
  const ProjectRow = createProjectRow({
    api,
    window,
    libraryStore,
    composerPort,
    commandRegistry,
    projectRemovalStore,
    log: log.child("project-row"),
  })
  const OpenProject = createOpenProject({
    api,
    window,
    libraryStore,
    composerPort,
    commandRegistry,
    chatDeletionStore,
    chatSwitchPresenter,
    ProjectRow,
    log: log.child("open-project"),
  })
  const PinnedProjects = createPinnedProjects({ api, libraryStore, ProjectRow, log: log.child("pinned-projects") })

  const chatSearchStore = new ChatSearchStore()
  const chatSearchPresenter = new ChatSearchPresenter(
    chatSearchStore,
    api,
    window,
    jumpPort,
    layoutPresenter,
    commandRegistry,
    chatSwitchPresenter,
    log.child("chat-search"),
  )
  chatSearchPresenter.start()
  const SearchBox = createSearchBox({ chatSearchStore, chatSearchPresenter })
  const SearchResults = createSearchResults({ libraryStore, chatSearchStore, chatSearchPresenter })

  const ResizeHandle = createSidebarResize({ layoutStore, layoutPresenter })

  return observer(function SidebarHost() {
    return (
      <Sidebar
        searching={chatSearchStore.searching}
        SearchBox={SearchBox}
        SearchResults={SearchResults}
        OpenProject={OpenProject}
        PinnedProjects={PinnedProjects}
        ResizeHandle={ResizeHandle}
      />
    )
  })
}
