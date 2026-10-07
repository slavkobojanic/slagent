import type { ComponentType } from "react"

export type ShellProps = {
  inert: boolean
  Header: ComponentType
  SidebarFrame: ComponentType
  MainColumn: ComponentType
  PanelFrame: ComponentType
  Settings: ComponentType
  Models: ComponentType
}

export function Shell({ inert, Header, SidebarFrame, MainColumn, PanelFrame, Settings, Models }: ShellProps) {
  return (
    <div className="flex h-full flex-col bg-background text-foreground" inert={inert}>
      <Header />
      <div className="flex min-h-0 flex-1">
        <SidebarFrame />
        <MainColumn />
        <PanelFrame />
      </div>
      <Settings />
      <Models />
    </div>
  )
}
