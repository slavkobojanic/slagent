import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ChatStatus, ProjectSummary } from "@shared/types"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { createChatList } from "./chat-list/create"
import { createChooseFolder } from "./choose-folder/create"
import { OpenProject } from "./open-project"
import { OpenProjectPresenter } from "./open-project-presenter/open-project-presenter"
import { OpenProjectStore } from "./open-project-store/open-project-store"

export function createOpenProject({
  api,
  window,
  libraryStore,
  composerPort,
  commandRegistry,
  chatDeletionStore,
  ProjectRow,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  composerPort: ComposerPort
  commandRegistry: CommandRegistry
  chatDeletionStore: ChatDeletionStore
  ProjectRow: ComponentType<{
    project: ProjectSummary
    status: ChatStatus
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
}): ComponentType {
  const store = new OpenProjectStore(libraryStore)
  const presenter = new OpenProjectPresenter(store)

  const ChooseFolder = createChooseFolder({ api, commandRegistry })
  const ChatList = createChatList({ api, window, libraryStore, composerPort, commandRegistry, chatDeletionStore })

  return observer(function OpenProjectHost() {
    return (
      <OpenProject
        project={store.project}
        collapsed={store.collapsed}
        onToggle={presenter.handleToggle}
        ProjectRow={ProjectRow}
        ChatList={ChatList}
        ChooseFolder={ChooseFolder}
      />
    )
  })
}
