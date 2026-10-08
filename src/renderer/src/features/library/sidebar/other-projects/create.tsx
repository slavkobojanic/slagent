import { observer } from "mobx-react-lite"
import { useCallback } from "react"
import type { ComponentType } from "react"
import type { ProjectSummary } from "@shared/types"
import type { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import { orderedChats } from "@/features/library/library-utils"
import { ChatList } from "@/features/library/sidebar/open-project/chat-list/chat-list"
import { ChatListFooter } from "@/features/library/sidebar/open-project/chat-list/chat-list-footer/chat-list-footer"
import { visibleChats } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import { createChatRow } from "@/features/library/sidebar/open-project/chat-list/chat-row/create"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import { OtherProjects } from "./other-projects"
import { OtherProjectsPresenter } from "./other-projects-presenter/other-projects-presenter"
import { OtherProjectsStore } from "./other-projects-store/other-projects-store"

export function createOtherProjects({
  api,
  window,
  libraryStore,
  chatDeletionStore,
  chatSwitchPresenter,
  ProjectRow,
  OpenProject,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  chatDeletionStore: ChatDeletionStore
  chatSwitchPresenter: ChatSwitchPresenter
  ProjectRow: ComponentType<{
    project: ProjectSummary
    active: boolean
    collapsed: boolean
    onSelect: (project: ProjectSummary) => void
  }>
  // The open project's section, rendered in its alphabetical place in the list.
  OpenProject: ComponentType
  log: Log
}): ComponentType {
  const store = new OtherProjectsStore(libraryStore)
  const presenter = new OtherProjectsPresenter(store, api, window, log)
  presenter.start()

  // One chat row component serves every project: the row resolves the chat's own project on open.
  const ChatRow = createChatRow({ api, window, libraryStore, chatDeletionStore, chatSwitchPresenter, log: log.child("other-project-chat-row") })

  const ProjectChatList = observer(function ProjectChatListHost({ projectId }: { projectId: string }) {
    // The chat summaries of a project that is not open arrive in `chatsByProject`.
    const chats = orderedChats(store.chatsOf(projectId))
    const showingAll = store.isShowingAll(projectId)
    const visible = visibleChats(chats, showingAll)
    const Footer = useCallback(
      () => (
        <ChatListFooter
          hiddenCount={chats.length - visible.length}
          canShowLess={showingAll && chats.length > visible.length}
          onShowAll={() => presenter.handleShowAll(projectId)}
          onShowLess={() => presenter.handleShowLess(projectId)}
        />
      ),
      [chats.length, visible.length, showingAll, projectId, presenter],
    )
    return (
      <ChatList
        chats={visible}
        empty={chats.length === 0}
        hasHidden={chats.length > visible.length}
        reduceMotion={store.reduceMotion}
        ChatRow={ChatRow}
        Footer={Footer}
      />
    )
  })

  return observer(function OtherProjectsHost() {
    return (
      <OtherProjects
        noProject={store.noProject ? { project: store.noProject, active: false } : null}
        others={store.others}
        isCollapsed={(projectId) => store.isCollapsed(projectId)}
        onToggle={presenter.handleToggle}
        onNewChat={presenter.handleNewChat}
        ProjectRow={ProjectRow}
        ProjectChatList={ProjectChatList}
        OpenProject={OpenProject}
        reduceMotion={store.reduceMotion}
      />
    )
  })
}
