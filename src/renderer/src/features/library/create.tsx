import { observer } from "mobx-react-lite"
import { ChatDeletionDialog } from "@/features/library/chat-deletion/chat-deletion-dialog"
import { ChatDeletionPresenter } from "@/features/library/chat-deletion/chat-deletion-presenter/chat-deletion-presenter"
import { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import { CommandPalette } from "@/features/library/command-palette/command-palette"
import { paletteGroups } from "@/features/library/command-palette/palette-items"
import { PalettePresenter } from "@/features/library/command-palette/palette-presenter/palette-presenter"
import { PaletteStore } from "@/features/library/command-palette/palette-store/palette-store"
import { canShowLess, chatDisplayStatus, openProjectOf, orderedChats, pinnedProjects, visibleChats } from "@/features/library/library-utils"
import { projectStatus } from "@/lib/projects"
import { LibraryPresenter } from "@/features/library/library-presenter/library-presenter"
import { NavHistoryPresenter } from "@/features/library/nav-history/nav-history-presenter/nav-history-presenter"
import { NavHistoryStore } from "@/features/library/nav-history/nav-history-store/nav-history-store"
import { ProjectRemovalDialog } from "@/features/library/project-removal/project-removal-dialog"
import { ProjectRemovalPresenter } from "@/features/library/project-removal/project-removal-presenter/project-removal-presenter"
import { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { ChatActions } from "@/features/library/sidebar/chat-row"
import type { ProjectActions } from "@/features/library/sidebar/project-row"
import { Sidebar as SidebarView } from "@/features/library/sidebar/sidebar"
import { SidebarPresenter } from "@/features/library/sidebar/sidebar-presenter/sidebar-presenter"
import { SidebarStore } from "@/features/library/sidebar/sidebar-store/sidebar-store"
import { modKey } from "@/lib/format"
import type { AppDeps } from "@/state/app-deps"
import type { LibrarySlots } from "@/state/slots"

// The owning create for the library slice. Called once at boot. It builds the stores and presenters, starts
// their listeners and keyboard commands, and returns the sidebar, the two confirmations, and the palette.
// Each host reads its stores and passes primitives and the presenter's callbacks down.
export function createLibrary(deps: AppDeps): LibrarySlots {
  const { services, env, mirror, shared } = deps
  const platform = services.app.platform
  const mod = modKey(platform)

  const sidebarStore = new SidebarStore()
  const chatDeletionStore = new ChatDeletionStore()
  const chatDeletion = new ChatDeletionPresenter(chatDeletionStore, services.library)
  const projectRemovalStore = new ProjectRemovalStore()
  const projectRemoval = new ProjectRemovalPresenter(projectRemovalStore, services.library)
  const library = new LibraryPresenter(services.library, services.chat, mirror.library, shared.composer, shared.commands, env)
  const sidebar = new SidebarPresenter(sidebarStore, library, shared.layoutPresenter, shared.jump, chatDeletion, projectRemoval, mirror.library, shared.commands, env)
  const navHistory = new NavHistoryPresenter(new NavHistoryStore(), services.library, services.chat, mirror.library, shared.composer, shared.commands, env)
  const chatSwitch = new ChatSwitchPresenter(mirror.library, shared.panelPresenter, shared.reviewPresenter)
  const paletteStore = new PaletteStore()
  const palette = new PalettePresenter(paletteStore, shared.overlay, library, services.commands, services.settings, shared.commands, shared.composer, env)

  library.start()
  sidebar.start()
  navHistory.start()
  chatSwitch.start()
  palette.start()

  const chatActions: ChatActions = {
    onOpen: sidebar.openChat,
    onPin: sidebar.pinChat,
    onRename: sidebar.startRename,
    onDraftChange: sidebar.handleDraftChange,
    onSave: sidebar.saveRename,
    onCancel: sidebar.cancelRename,
    onDelete: sidebar.deleteChat,
    onCopy: sidebar.copyTranscript,
    onMenuOpenChange: sidebar.setChatMenuOpen,
  }
  const projectActions: ProjectActions = {
    onOpen: sidebar.openProject,
    onToggle: sidebar.toggleProject,
    onNewChat: sidebar.newChat,
    onPin: sidebar.pinProject,
    onRemove: sidebar.removeProject,
  }
  const resizeStart = (event: PointerEvent) => {
    shared.layoutPresenter.handleResizeStart("sidebar", event)
  }
  const resizeReset = () => {
    shared.layoutPresenter.handleResizeReset("sidebar")
  }

  const Sidebar = observer(function SidebarHost() {
    const libraryState = mirror.library.library
    const chats = orderedChats(libraryState.chats)
    const shown = visibleChats(chats, sidebarStore.showAll)
    const project = openProjectOf(libraryState)
    const openChatId = libraryState.openChatId
    const now = sidebarStore.now
    return (
      <SidebarView
        open={shared.layout.sidebarOpen}
        resizing={shared.layout.resizing === "sidebar"}
        reduceMotion={sidebarStore.reduceMotion}
        modKey={mod}
        onResizeStart={resizeStart}
        onResizeReset={resizeReset}
        query={sidebarStore.query}
        results={sidebarStore.results}
        openChatId={openChatId}
        onQueryChange={sidebar.handleQueryChange}
        onSearchKeyDown={sidebar.handleSearchKeyDown}
        onClearSearch={sidebar.clearSearch}
        onOpenResult={sidebar.openResult}
        project={project}
        collapsed={project !== null && sidebarStore.isCollapsed(project.id)}
        rows={shown.map((chat) => ({
          chat,
          status: chatDisplayStatus(chat, now),
          active: chat.id === openChatId,
          renaming: sidebarStore.renamingId === chat.id,
          menuOpen: sidebarStore.menuChatId === chat.id,
        }))}
        totalChats={chats.length}
        hiddenCount={chats.length - shown.length}
        canShowLess={canShowLess(chats.length, sidebarStore.showAll)}
        draft={sidebarStore.draft}
        chatActions={chatActions}
        projectActions={projectActions}
        onChooseFolder={sidebar.chooseFolder}
        onShowAll={sidebar.handleShowAll}
        onShowLess={sidebar.handleShowLess}
        pinned={pinnedProjects(libraryState.projects, libraryState.openProjectId).map((pinnedProject) => ({
          project: pinnedProject,
          status: projectStatus(pinnedProject),
        }))}
      />
    )
  })

  const LibraryDialogs = observer(function LibraryDialogsHost() {
    return (
      <>
        <ChatDeletionDialog
          open={chatDeletionStore.open}
          chatTitle={chatDeletionStore.target?.title ?? ""}
          busy={chatDeletionStore.busy}
          onCancel={chatDeletion.handleCancel}
          onConfirm={() => void chatDeletion.handleConfirm()}
        />
        <ProjectRemovalDialog
          open={projectRemovalStore.open}
          projectName={projectRemovalStore.target?.name ?? ""}
          projectPath={projectRemovalStore.target?.path ?? ""}
          typed={projectRemovalStore.typed}
          confirmed={projectRemovalStore.confirmed}
          busy={projectRemovalStore.busy}
          onTypedChange={projectRemoval.handleTypedChange}
          onCancel={projectRemoval.handleCancel}
          onConfirm={() => void projectRemoval.handleConfirm()}
        />
      </>
    )
  })

  const CommandPaletteHost = observer(function CommandPaletteHost() {
    const libraryState = mirror.library.library
    const meta = mirror.meta.meta
    return (
      <CommandPalette
        open={shared.overlay.paletteOpen}
        query={paletteStore.query}
        onOpenChange={palette.handleOpenChange}
        onQueryChange={palette.handleQueryChange}
        groups={paletteGroups({
          platform,
          commands: shared.commands.commands,
          chats: libraryState.chats,
          projects: libraryState.projects,
          slashCommands: paletteStore.slashCommands,
          query: paletteStore.query,
          models: meta?.models ?? [],
          currentModelId: meta?.modelId ?? null,
          streaming: mirror.run.streaming,
          onRunCommand: palette.handleRunCommand,
          onOpenChat: palette.handleOpenChat,
          onOpenProject: palette.handleOpenProject,
          onFillCommand: palette.handleFillCommand,
          onSelectModel: palette.handleSelectModel,
        })}
      />
    )
  })

  return { Sidebar, LibraryDialogs, CommandPalette: CommandPaletteHost }
}
