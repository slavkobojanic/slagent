import type { ComponentType, CSSProperties, ReactNode } from "react"

export type ShellProps = {
  header: ReactNode
  // True while permissions are missing. The window is then inert behind the permissions wizard.
  inert: boolean
  ready: boolean
  metaError: string | null
  actionError: string | null
  // Keys that remount the transcript and the composer when the open chat changes.
  transcriptKey: string
  composerKey: string
  sidebarOpen: boolean
  sidebarWidth: number
  sidebarResizing: boolean
  panelOpen: boolean
  panelWidth: number
  panelResizing: boolean
  // The right panel only exists once a folder is open.
  showPanel: boolean
  Sidebar: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  RightPanel: ComponentType
  SettingsDialog: ComponentType
  ModelDialog: ComponentType
  CommandPalette: ComponentType
  LibraryDialogs: ComponentType
  PermissionsWizard: ComponentType
}

// The page grid. The header spans the top, the sidebar and the right panel are slots on each
// side of the main column, and the overlays portal out of the tree.
export function Shell({
  header,
  inert,
  ready,
  metaError,
  actionError,
  transcriptKey,
  composerKey,
  sidebarOpen,
  sidebarWidth,
  sidebarResizing,
  panelOpen,
  panelWidth,
  panelResizing,
  showPanel,
  Sidebar,
  Transcript,
  Composer,
  RightPanel,
  SettingsDialog,
  ModelDialog,
  CommandPalette,
  LibraryDialogs,
  PermissionsWizard,
}: ShellProps) {
  return (
    <>
      <div className="flex h-full flex-col bg-background text-foreground" inert={inert}>
        {header}
        <div className="flex min-h-0 flex-1">
          <div
            className="sidebar-slot"
            data-closed={sidebarOpen ? undefined : true}
            data-resizing={sidebarResizing ? true : undefined}
            inert={sidebarOpen ? undefined : true}
            style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
          >
            <Sidebar />
          </div>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {metaError !== null ? <p className="border-b border-foreground/10 px-6 py-2 text-sm text-destructive">{metaError}</p> : null}
            {actionError !== null ? (
              <p role="alert" className="border-b border-foreground/10 px-6 py-2 text-sm text-destructive">
                {actionError}
              </p>
            ) : null}
            {ready ? <Transcript key={transcriptKey} /> : <div className="flex flex-1 items-center justify-center text-sm text-foreground/50">Starting</div>}
            <Composer key={composerKey} />
          </main>
          <div
            className="panel-slot"
            data-closed={panelOpen ? undefined : true}
            data-resizing={panelResizing ? true : undefined}
            inert={panelOpen ? undefined : true}
            style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
          >
            {showPanel ? <RightPanel /> : null}
          </div>
        </div>
        <SettingsDialog />
        <ModelDialog />
        <CommandPalette />
        <LibraryDialogs />
      </div>
      <PermissionsWizard />
    </>
  )
}
