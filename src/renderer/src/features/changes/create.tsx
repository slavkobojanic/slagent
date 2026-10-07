import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { Changes } from "./changes"
import { ChangesPresenter } from "./changes-presenter/changes-presenter"
import { ChangesStore } from "./changes-store/changes-store"
import { createChangesTabs } from "./changes-tabs/create"
import { createDiffPanel } from "./diff-panel/create"
import { createFileViewer } from "./file-viewer/create"
import { createPlanDocument } from "./plan-document/create"

export function createChanges({
  api,
  window,
  metaStore,
  runStore,
  panelStore,
  panelPresenter,
  layoutStore,
  layoutPresenter,
  reviewStore,
  reviewPresenter,
  themeStore,
  commandRegistry,
}: {
  api: API
  window: Window
  metaStore: MetaStore
  runStore: RunStore
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  reviewStore: ReviewStore
  reviewPresenter: ReviewPresenter
  themeStore: ThemeStore
  commandRegistry: CommandRegistry
}): ComponentType {
  const changesStore = new ChangesStore(panelStore, runStore, metaStore)
  const changesPresenter = new ChangesPresenter(changesStore, panelStore, panelPresenter, layoutPresenter, commandRegistry)
  changesPresenter.start()

  const ChangesTabs = createChangesTabs({ changesStore, changesPresenter })
  const DiffPanel = createDiffPanel({ api, window, runStore, panelPresenter, reviewStore, reviewPresenter, themeStore, changesStore })
  const FileViewer = createFileViewer({ api, window, panelStore, themeStore })
  const PlanDocument = createPlanDocument({ changesStore })

  return observer(function ChangesHost() {
    return (
      <Changes
        resizing={layoutStore.resizing === "diff"}
        showing={changesStore.showing}
        Tabs={ChangesTabs}
        DiffPanel={DiffPanel}
        FileViewer={FileViewer}
        PlanDocument={PlanDocument}
        onResizeStart={changesPresenter.handleResizeStart}
        onResizeReset={changesPresenter.handleResizeReset}
      />
    )
  })
}
