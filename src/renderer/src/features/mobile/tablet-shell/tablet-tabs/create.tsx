import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { TabletPresenter } from "@/features/mobile/tablet-shell/tablet-presenter/tablet-presenter"
import { PANEL_TABS, PORTRAIT_TABS, type TabletTab } from "@/features/mobile/tablet-shell/tablet-tab"
import { TabletTabs } from "./tablet-tabs"

// One switcher for both layouts: portrait lists Chat first and sits at the top edge, landscape's
// docked panel lists only its own tabs.
export function createTabletTabs({
  changesStore,
  runStore,
  tabletPresenter,
  panelStore,
  portrait,
}: {
  changesStore: MobileChangesStore
  runStore: RunStore
  tabletPresenter: TabletPresenter
  panelStore: { tab: TabletTab }
  portrait: boolean
}): ComponentType {
  return observer(function TabletTabsHost() {
    const badges: Partial<Record<TabletTab, string>> = {}
    if (changesStore.changedCount > 0) {
      badges.changes = changesStore.changedCount > 9 ? "9+" : String(changesStore.changedCount)
    }
    if (runStore.planProposal) {
      badges.plan = "•"
    }
    return (
      <TabletTabs
        tabs={portrait ? PORTRAIT_TABS : PANEL_TABS}
        active={portrait ? tabletPresenter.activeTab : panelStore.tab}
        badges={badges}
        safeTop={portrait}
        onSelect={tabletPresenter.selectTab}
      />
    )
  })
}
