import type { ComponentType } from "react"

export type ShellProps = {
  inert: boolean
  Header: ComponentType
  SidebarFrame: ComponentType
  MainColumn: ComponentType
  PanelFrame: ComponentType
  TerminalDrawer: ComponentType
  StatusBar: ComponentType
  Settings: ComponentType
  Models: ComponentType
  CreateSkill: ComponentType
}

export function Shell({ inert, Header, SidebarFrame, MainColumn, PanelFrame, TerminalDrawer, StatusBar, Settings, Models, CreateSkill }: ShellProps) {
  return (
    <div className="flex h-full flex-col bg-background text-foreground" inert={inert}>
      <Header />
      <div className="flex min-h-0 flex-1">
        <SidebarFrame />
        <MainColumn />
        <PanelFrame />
      </div>
      <TerminalDrawer />
      <StatusBar />
      <Settings />
      <Models />
      <CreateSkill />
    </div>
  )
}
