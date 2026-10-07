import { PanelLeft, PanelRight, Settings } from "lucide-react"
import { ProviderLogo } from "@/components/provider-logo"
import { Button } from "@/components/ui/button"
import { ProjectMenu, type ProjectMenuItem } from "@/features/shell/project-menu"
import { cn } from "@/lib/utils"
import type { ModelProvider } from "@shared/types"

export type ShellHeaderProps = {
  // On macOS the header starts after the window's traffic lights.
  macos: boolean
  sidebarOpen: boolean
  sidebarTitle: string
  onToggleSidebar: () => void
  projectLabel: string
  projectPath: string | undefined
  projects: ProjectMenuItem[]
  // The open chat's title, or null for a draft.
  chatTitle: string | null
  onOpenProject: (projectId: string) => void
  onChooseFolder: () => void
  // The version of an update waiting to install, or null.
  updateVersion: string | null
  installingUpdate: boolean
  onInstallUpdate: () => void
  modelName: string
  modelProvider: ModelProvider | null
  // False when no provider is connected. The model button then shows a badge.
  configured: boolean
  modelDisabled: boolean
  onOpenModel: () => void
  panelOpen: boolean
  panelTitle: string
  panelDisabled: boolean
  onTogglePanel: () => void
  // True when an MCP server needs sign-in. The settings button then shows a badge.
  mcpNeedsAuth: boolean
  onOpenSettings: () => void
}

// The top bar of the window. It spans the full width above the sidebar and the main column.
export function ShellHeader({
  macos,
  sidebarOpen,
  sidebarTitle,
  onToggleSidebar,
  projectLabel,
  projectPath,
  projects,
  chatTitle,
  onOpenProject,
  onChooseFolder,
  updateVersion,
  installingUpdate,
  onInstallUpdate,
  modelName,
  modelProvider,
  configured,
  modelDisabled,
  onOpenModel,
  panelOpen,
  panelTitle,
  panelDisabled,
  onTogglePanel,
  mcpNeedsAuth,
  onOpenSettings,
}: ShellHeaderProps) {
  return (
    <header className={cn("drag flex h-12 shrink-0 items-center gap-2 border-b border-foreground/10 pr-3", macos ? "pl-20" : "pl-4")}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="no-drag"
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        title={sidebarTitle}
        aria-pressed={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <PanelLeft className="size-4" />
      </Button>
      <span className="text-sm font-medium tracking-tight">slagent</span>
      <span className="text-foreground/25">/</span>
      <ProjectMenu label={projectLabel} path={projectPath} projects={projects} onOpenProject={onOpenProject} onChooseFolder={onChooseFolder} />
      {chatTitle !== null ? (
        <>
          <span className="text-foreground/25">/</span>
          <span className="min-w-0 truncate text-sm text-foreground/50" title={chatTitle}>
            {chatTitle}
          </span>
        </>
      ) : null}
      <div className="no-drag ml-auto flex items-center gap-1">
        {updateVersion !== null ? (
          <Button
            type="button"
            size="sm"
            className="mr-1 bg-info text-white hover:bg-info/90"
            title="Restart to install the update"
            disabled={installingUpdate}
            onClick={onInstallUpdate}
          >
            Update available (v{updateVersion})
          </Button>
        ) : null}
        <Button type="button" variant="ghost" className="relative max-w-56" disabled={modelDisabled} onClick={onOpenModel}>
          <ProviderLogo provider={modelProvider} />
          <span className="truncate">{modelName}</span>
          {configured ? null : <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={panelOpen ? "Hide panel" : "Show panel"}
          aria-pressed={panelOpen}
          title={panelTitle}
          disabled={panelDisabled}
          onClick={onTogglePanel}
        >
          <PanelRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Settings"
          data-genie-target="settings"
          onClick={onOpenSettings}
        >
          <Settings className="size-4" />
          {mcpNeedsAuth ? <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" /> : null}
        </Button>
      </div>
    </header>
  )
}
