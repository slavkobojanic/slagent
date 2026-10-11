import type { ComponentType, ReactNode } from "react"

export type ShellProps = {
  inert: boolean
  Header: ComponentType
  SidebarFrame: ComponentType
  ChatSlot: ComponentType
  EditorFrame: ComponentType
  PanelFrame: ComponentType
  TerminalDrawer: ComponentType
  TerminalBar: ComponentType<{ branch?: ReactNode }>
  Settings: ComponentType
  Models: ComponentType
  CreateSkill: ComponentType
}

export function Shell({ inert, Header, SidebarFrame, ChatSlot, EditorFrame, PanelFrame, TerminalDrawer, TerminalBar, Settings, Models, CreateSkill }: ShellProps) {
  return (
    <div className="flex h-full flex-col bg-background text-foreground" inert={inert}>
      <Header />
      <div className="flex min-h-0 flex-1">
        <SidebarFrame />
        <ChatSlot />
        <EditorFrame />
        <PanelFrame />
      </div>
      <TerminalDrawer />
      <TerminalBar />
      <Settings />
      <Models />
      <CreateSkill />
    </div>
  )
}
