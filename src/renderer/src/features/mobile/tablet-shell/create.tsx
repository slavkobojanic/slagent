import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MobileChangesPresenter } from "@/features/mobile/changes-screen/changes-presenter/changes-presenter"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import { createMobileChatScreen } from "@/features/mobile/chat-screen/create"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createTabletPanel, createTabletPanelBodies } from "./tablet-panel/create"
import { TabletPanelBody } from "./tablet-panel/tablet-panel"
import { TabletPresenter } from "./tablet-presenter/tablet-presenter"
import { TabletShell } from "./tablet-shell"
import { TabletSidebar } from "./tablet-sidebar"
import { createTabletTabs } from "./tablet-tabs/create"

// The iPad's layout: the chat list, the chat and the right panel docked side by side in
// landscape; in portrait the list stays docked and one strip switches chat, diff, plan, source.
export function createTablet({
  api,
  window,
  metaStore,
  runStore,
  themeStore,
  mobileStore,
  mobilePresenter,
  changesStore,
  changesPresenter,
  panelStore,
  panelPresenter,
  ChatList,
  ConnectionSheet,
  Banner,
  Transcript,
  Composer,
  PlanOverlay,
  log,
}: {
  api: API
  window: Window
  metaStore: MetaStore
  runStore: RunStore
  themeStore: ThemeStore
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  changesStore: MobileChangesStore
  changesPresenter: MobileChangesPresenter
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  ChatList: ComponentType
  ConnectionSheet: ComponentType
  Banner: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
  log: Log
}): ComponentType {
  const tabletPresenter = new TabletPresenter(panelStore, panelPresenter, log.child("tablet"))

  const ChatScreen = createMobileChatScreen({
    metaStore,
    mobileStore,
    mobilePresenter,
    changesStore,
    changesPresenter,
    Banner,
    Transcript,
    Composer,
    PlanOverlay,
    tablet: { onToggleSidebar: mobilePresenter.toggleSidebar, onTogglePanel: tabletPresenter.togglePanel },
  })
  const bodies = createTabletPanelBodies({ api, window, changesStore, changesPresenter, runStore, panelStore, themeStore, tabletPresenter, log })
  const PanelTabs = createTabletTabs({ changesStore, runStore, tabletPresenter, panelStore, portrait: false })
  const PortraitTabs = createTabletTabs({ changesStore, runStore, tabletPresenter, panelStore, portrait: true })
  const Panel = createTabletPanel({ Tabs: PanelTabs, bodies, panelStore })
  const Sidebar = function SidebarHost() {
    return <TabletSidebar ChatList={ChatList} />
  }
  const PortraitPage = observer(function PortraitPageHost() {
    if (tabletPresenter.activeTab === "chat") {
      return <ChatScreen />
    }
    return (
      <div className="mobile-safe-bottom flex h-full flex-col bg-background text-foreground">
        <TabletPanelBody active={tabletPresenter.activeTab} {...bodies} />
      </div>
    )
  })

  return observer(function TabletHost() {
    if (mobileStore.layout === "phone") {
      return null
    }
    return (
      <TabletShell
        layout={mobileStore.layout}
        sidebarOpen={mobileStore.sidebarOpen}
        panelOpen={panelStore.open}
        Sidebar={Sidebar}
        ChatScreen={ChatScreen}
        Panel={Panel}
        PortraitTabs={PortraitTabs}
        PortraitPage={PortraitPage}
        ConnectionSheet={ConnectionSheet}
      />
    )
  })
}
