import type { ComponentType } from "react"
import { PanelFrame } from "@/features/shell/panel-frame/panel-frame"
import { SidebarFrame } from "@/features/shell/sidebar-frame/sidebar-frame"
import type { MobileLayout } from "@/features/mobile/mobile-screen"
import "@/features/shell/shell.css"

// Fixed widths: a touch pane has no drag handle, and the chat takes what is left.
export const TABLET_SIDEBAR_WIDTH = 320
export const TABLET_PANEL_WIDTH = 420

export type TabletShellProps = {
  layout: Exclude<MobileLayout, "phone">
  sidebarOpen: boolean
  panelOpen: boolean
  Sidebar: ComponentType
  ChatScreen: ComponentType
  // Landscape docks the panel; portrait folds its tabs into one strip over the page.
  Panel: ComponentType
  PortraitTabs: ComponentType
  PortraitPage: ComponentType
  ConnectionSheet: ComponentType
}

export function TabletShell({ layout, sidebarOpen, panelOpen, Sidebar, ChatScreen, Panel, PortraitTabs, PortraitPage, ConnectionSheet }: TabletShellProps) {
  return (
    <div className="flex h-full bg-background text-foreground">
      <SidebarFrame open={sidebarOpen} width={TABLET_SIDEBAR_WIDTH} resizing={false} Library={Sidebar} />
      {layout === "landscape" ? (
        <>
          <div className="min-w-0 flex-1">
            <ChatScreen />
          </div>
          <PanelFrame open={panelOpen} width={TABLET_PANEL_WIDTH} resizing={false} visible Changes={Panel} />
        </>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <PortraitTabs />
          <div className="mobile-tablet-page min-h-0 flex-1">
            <PortraitPage />
          </div>
        </div>
      )}
      <ConnectionSheet />
    </div>
  )
}
