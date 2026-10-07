import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { DiffPanelPresenter } from "@/features/changes/diff-panel/diff-panel-presenter/diff-panel-presenter"
import type { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import type { FileDiff } from "@/lib/diff"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { DiffFile } from "./diff-file"

export function createDiffFile({
  diffPanelStore,
  diffPanelPresenter,
  reviewStore,
  themeStore,
}: {
  diffPanelStore: DiffPanelStore
  diffPanelPresenter: DiffPanelPresenter
  reviewStore: ReviewStore
  themeStore: ThemeStore
}): ComponentType<{ file: FileDiff }> {
  return observer(function DiffFileHost({ file }: { file: FileDiff }) {
    return (
      <DiffFile
        file={file}
        comments={reviewStore.diffComments}
        draft={diffPanelStore.draft}
        themeType={themeStore.resolved}
        onStartDraft={diffPanelPresenter.handleStartDraft}
        onDraftSave={diffPanelPresenter.handleDraftSave}
        onDraftCancel={diffPanelPresenter.handleDraftCancel}
        onRemoveComment={diffPanelPresenter.handleRemoveComment}
        onViewFile={diffPanelPresenter.handleViewFile}
      />
    )
  })
}
