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
import { createChooseFolder } from "./open-project/choose-folder/create"
import { createOpenProject } from "./open-project/create"
import { createOtherProjects } from "./other-projects/create"
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
  const OtherProjects = createOtherProjects({
    api,
    window,
    libraryStore,
    chatDeletionStore,
    chatSwitchPresenter,
    ProjectRow,
    OpenProject,
    log: log.child("other-projects"),
  })
  // The folder prompt shows only while no project is open.
  const ChooseFolderPrompt = createChooseFolder({ api, commandRegistry, log: log.child("choose-folder") })
  const ChooseFolder = observer(function ChooseFolderHost() {
    if (libraryStore.library.openProjectId !== null) {
      return null
    }
    return <ChooseFolderPrompt />
  })

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
        ChooseFolder={ChooseFolder}
        OtherProjects={OtherProjects}
        ResizeHandle={ResizeHandle}
      />
    )
  })
}
