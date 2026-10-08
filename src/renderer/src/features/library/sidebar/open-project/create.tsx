import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { createChatList } from "./chat-list/create"
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
  chatSwitchPresenter,
  ProjectRow,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  composerPort: ComposerPort
  commandRegistry: CommandRegistry
  chatDeletionStore: ChatDeletionStore
  chatSwitchPresenter: ChatSwitchPresenter
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  log: Log
}): ComponentType {
  const store = new OpenProjectStore(libraryStore)
  const presenter = new OpenProjectPresenter(store, api, window, log)
  presenter.start()

  const ChatList = createChatList({
    api,
    window,
    libraryStore,
    composerPort,
    commandRegistry,
    chatDeletionStore,
    chatSwitchPresenter,
    log: log.child("chat-list"),
  })

  return observer(function OpenProjectHost() {
    return (
      <OpenProject
        project={store.project}
        collapsed={store.collapsed}
        onToggle={presenter.handleToggle}
        onNewChat={presenter.handleNewChat}
        ProjectRow={ProjectRow}
        ChatList={ChatList}
        reduceMotion={store.reduceMotion}
      />
    )
  })
}
