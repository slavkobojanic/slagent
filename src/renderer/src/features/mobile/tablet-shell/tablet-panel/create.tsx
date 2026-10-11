import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createFileViewer } from "@/features/changes/file-viewer/create"
import { PlanDocument } from "@/features/changes/plan-document/plan-document"
import type { MobileChangesPresenter } from "@/features/mobile/changes-screen/changes-presenter/changes-presenter"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import { MobileDiffList } from "@/features/mobile/changes-screen/diff-list/diff-list"
import type { TabletPresenter } from "@/features/mobile/tablet-shell/tablet-presenter/tablet-presenter"
import type { API } from "@/ipc/api"
import { cn } from "@/lib/utils"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { TabletPanel, TabletPanelBody } from "./tablet-panel"

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-foreground/50">{text}</p>
}

// The tablet's right panel: the same read-only diff as the phone's changes screen, the plan
// proposal, and the source file a tapped diff entry opens.
export function createTabletPanelBodies({
  api,
  window,
  changesStore,
  changesPresenter,
  runStore,
  panelStore,
  themeStore,
  tabletPresenter,
  log,
}: {
  api: API
  window: Window
  changesStore: MobileChangesStore
  changesPresenter: MobileChangesPresenter
  runStore: RunStore
  panelStore: PanelStore
  themeStore: ThemeStore
  tabletPresenter: TabletPresenter
  log: Log
}): { Diff: ComponentType; Plan: ComponentType; Source: ComponentType } {
  const Diff = observer(function TabletDiffHost() {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border pr-1 pl-3 text-xs">
          <span className="min-w-0 flex-1 truncate text-foreground/60">{changesStore.branchLabel}</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Refresh" onClick={changesPresenter.handleRefresh}>
            <RefreshCwIcon className={cn("size-4", changesStore.loading && "animate-spin")} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MobileDiffList files={changesStore.files} emptyText={changesStore.emptyText} themeType={themeStore.resolved} onOpenFile={tabletPresenter.openFile} />
        </div>
      </div>
    )
  })

  const Plan = observer(function TabletPlanHost() {
    const plan = runStore.planProposal
    return plan ? <PlanDocument plan={plan} /> : <Empty text="No plan yet. Ask the agent to plan and it appears here." />
  })

  const FileViewer = createFileViewer({ api, window, panelStore, themeStore, log: log.child("file-viewer") })
  const Source = observer(function TabletSourceHost() {
    return panelStore.viewedFile === null ? <Empty text="Tap a file in the diff or a path in the chat to read it here." /> : <FileViewer />
  })

  return { Diff, Plan, Source }
}

export function createTabletPanel({ Tabs, bodies, panelStore }: { Tabs: ComponentType; bodies: { Diff: ComponentType; Plan: ComponentType; Source: ComponentType }; panelStore: PanelStore }): ComponentType {
  const Body = observer(function TabletPanelBodyHost() {
    return <TabletPanelBody active={panelStore.tab} {...bodies} />
  })
  return function TabletPanelHost() {
    return <TabletPanel Tabs={Tabs} Body={Body} />
  }
}
