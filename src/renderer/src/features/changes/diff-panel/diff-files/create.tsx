import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { DiffPanelPresenter } from "@/features/changes/diff-panel/diff-panel-presenter/diff-panel-presenter"
import type { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createDiffFile } from "./diff-file/create"
import { DiffFiles } from "./diff-files"

export function createDiffFiles({
  diffPanelStore,
  diffPanelPresenter,
  reviewStore,
  themeStore,
}: {
  diffPanelStore: DiffPanelStore
  diffPanelPresenter: DiffPanelPresenter
  reviewStore: ReviewStore
  themeStore: ThemeStore
}): ComponentType {
  const DiffFile = createDiffFile({ diffPanelStore, diffPanelPresenter, reviewStore, themeStore })

  return observer(function DiffFilesHost() {
    return <DiffFiles files={diffPanelStore.files} emptyText={diffPanelStore.emptyText} DiffFile={DiffFile} />
  })
}
