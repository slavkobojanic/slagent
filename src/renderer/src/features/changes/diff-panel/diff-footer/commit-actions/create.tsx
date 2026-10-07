import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { DiffPanelPresenter } from "@/features/changes/diff-panel/diff-panel-presenter/diff-panel-presenter"
import type { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import { CommitActions } from "./commit-actions"

export function createCommitActions({ diffPanelStore, diffPanelPresenter }: { diffPanelStore: DiffPanelStore; diffPanelPresenter: DiffPanelPresenter }): ComponentType {
  return observer(function CommitActionsHost() {
    return (
      <CommitActions
        canCommit={diffPanelStore.canCommit}
        canPublish={diffPanelStore.canPublish}
        pushLabel={diffPanelStore.pushLabel}
        onCommit={diffPanelPresenter.handleCommit}
        onPush={diffPanelPresenter.handlePush}
        onOpenPr={diffPanelPresenter.handleOpenPr}
      />
    )
  })
}
