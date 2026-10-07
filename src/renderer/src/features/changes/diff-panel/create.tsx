import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createDiffFiles } from "./diff-files/create"
import { createDiffFooter } from "./diff-footer/create"
import { DiffPanel } from "./diff-panel"
import { DiffPanelPresenter } from "./diff-panel-presenter/diff-panel-presenter"
import { DiffPanelStore } from "./diff-panel-store/diff-panel-store"

export function createDiffPanel({
  api,
  window,
  runStore,
  panelPresenter,
  reviewStore,
  reviewPresenter,
  themeStore,
  changesStore,
}: {
  api: API
  window: Window
  runStore: RunStore
  panelPresenter: PanelPresenter
  reviewStore: ReviewStore
  reviewPresenter: ReviewPresenter
  themeStore: ThemeStore
  changesStore: ChangesStore
}): ComponentType {
  const diffPanelStore = new DiffPanelStore()
  const diffPanelPresenter = new DiffPanelPresenter(diffPanelStore, changesStore, runStore, api, panelPresenter, reviewPresenter, window)
  diffPanelPresenter.start()

  const DiffFiles = createDiffFiles({ diffPanelStore, diffPanelPresenter, reviewStore, themeStore })
  const DiffFooter = createDiffFooter({ diffPanelStore, diffPanelPresenter })

  return observer(function DiffPanelHost() {
    return (
      <DiffPanel
        branch={diffPanelStore.branchLabel}
        scope={diffPanelStore.scope}
        loading={diffPanelStore.loading}
        DiffFiles={DiffFiles}
        DiffFooter={DiffFooter}
        onScope={diffPanelPresenter.handleScope}
        onRefresh={diffPanelPresenter.handleRefresh}
      />
    )
  })
}
