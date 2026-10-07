import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { Shell } from "@/features/shell/shell"
import { ShellHeader } from "@/features/shell/shell-header"
import { ShellPresenter } from "@/features/shell/shell-presenter/shell-presenter"
import { ShellStore } from "@/features/shell/shell-store/shell-store"
import { openChatOf, openProjectOf, panelToggleTitle, sidebarToggleTitle } from "@/features/shell/shell-utils"
import { projectStatus, sortedProjects } from "@/lib/projects"
import { UpdatePresenter } from "@/features/shell/update-presenter/update-presenter"
import { UpdateStore } from "@/features/shell/update-store/update-store"
import { modKey } from "@/lib/format"
import type { AppDeps } from "@/state/app-deps"
import type { ShellSlots } from "@/state/slots"

// The owning create for the shell. Called once at boot. It builds the header's stores and
// presenters, starts the update listener, registers the sidebar shortcut, and returns the root view.
// The root only reads stores here and passes primitives and callbacks down.
export function createShell({ services, mirror, shared, slots }: AppDeps & { slots: ShellSlots }): ComponentType {
  const update = new UpdateStore()
  const updatePresenter = new UpdatePresenter(update, services.updates)
  const shellStore = new ShellStore()
  const shellPresenter = new ShellPresenter(shellStore, shared.overlay, shared.panel, shared.panelPresenter, services.library)
  const platform = services.app.platform
  const mod = modKey(platform)

  updatePresenter.start()
  shared.commands.register({
    id: "sidebar.toggle",
    label: "Toggle sidebar",
    group: "Actions",
    shortcut: { key: "b", mod: true },
    run: shared.layoutPresenter.toggleSidebar,
  })

  return observer(function ShellHost() {
    const library = mirror.library.library
    const meta = mirror.meta.meta
    const project = openProjectOf(library)
    const chat = openChatOf(library)
    const cwd = meta?.cwd ?? ""
    const ready = mirror.meta.ready
    const sidebarOpen = shared.layout.sidebarOpen
    const panelOpen = shared.panel.open

    const header = (
      <ShellHeader
        macos={platform === "darwin"}
        sidebarOpen={sidebarOpen}
        sidebarTitle={sidebarToggleTitle(sidebarOpen, mod)}
        onToggleSidebar={shared.layoutPresenter.toggleSidebar}
        projectLabel={project?.name ?? "Choose folder"}
        projectPath={project?.path}
        projects={sortedProjects(library.projects).map((item) => ({ id: item.id, name: item.name, status: projectStatus(item) }))}
        chatTitle={chat?.title ?? null}
        onOpenProject={shellPresenter.openProject}
        onChooseFolder={shellPresenter.chooseFolder}
        updateVersion={update.version}
        installingUpdate={update.installing}
        onInstallUpdate={updatePresenter.installUpdate}
        modelName={meta?.modelName ?? "Choose model"}
        modelProvider={meta?.modelProvider ?? null}
        configured={mirror.meta.configured}
        modelDisabled={!ready || mirror.run.streaming}
        onOpenModel={shellPresenter.openModel}
        panelOpen={panelOpen}
        panelTitle={panelToggleTitle(panelOpen, mod)}
        panelDisabled={cwd === ""}
        onTogglePanel={shellPresenter.togglePanel}
        mcpNeedsAuth={shared.mcp.servers.some((server) => server.state === "needs-auth")}
        onOpenSettings={shellPresenter.openSettings}
      />
    )

    return (
      <Shell
        header={header}
        inert={shared.permissions.locked}
        ready={ready}
        metaError={meta?.error || null}
        actionError={update.error ?? shellStore.error}
        transcriptKey={`transcript-${mirror.run.transcriptChatId ?? "draft"}`}
        composerKey={mirror.library.openChatId ?? "draft"}
        sidebarOpen={sidebarOpen}
        sidebarWidth={shared.layout.sidebarWidth}
        sidebarResizing={shared.layout.resizing === "sidebar"}
        panelOpen={panelOpen}
        panelWidth={shared.layout.diffWidth}
        panelResizing={shared.layout.resizing === "diff"}
        showPanel={cwd !== ""}
        Sidebar={slots.Sidebar}
        Transcript={slots.Transcript}
        Composer={slots.Composer}
        RightPanel={slots.RightPanel}
        SettingsDialog={slots.SettingsDialog}
        ModelDialog={slots.ModelDialog}
        CommandPalette={slots.CommandPalette}
        LibraryDialogs={slots.LibraryDialogs}
        PermissionsWizard={slots.PermissionsWizard}
      />
    )
  })
}
