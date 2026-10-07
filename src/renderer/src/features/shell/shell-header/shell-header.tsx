import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export type ShellHeaderProps = {
  // On macOS the header starts after the window's traffic lights.
  macos: boolean
  SidebarToggle: ComponentType
  ProjectMenu: ComponentType
  ChatTitle: ComponentType
  UpdateButton: ComponentType
  ModelButton: ComponentType
  PanelToggle: ComponentType
  SettingsButton: ComponentType
}

export function ShellHeader({ macos, SidebarToggle, ProjectMenu, ChatTitle, UpdateButton, ModelButton, PanelToggle, SettingsButton }: ShellHeaderProps) {
  return (
    <header className={cn("drag flex h-12 shrink-0 items-center gap-2 border-b border-foreground/10 pr-3", macos ? "pl-20" : "pl-4")}>
      <SidebarToggle />
      <span className="text-sm font-medium tracking-tight">slagent</span>
      <span className="text-foreground/25">/</span>
      <ProjectMenu />
      <ChatTitle />
      <div className="no-drag ml-auto flex items-center gap-1">
        <UpdateButton />
        <ModelButton />
        <PanelToggle />
        <SettingsButton />
      </div>
    </header>
  )
}
