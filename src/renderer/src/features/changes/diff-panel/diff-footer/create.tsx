import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { DiffPanelPresenter } from "@/features/changes/diff-panel/diff-panel-presenter/diff-panel-presenter"
import type { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import { createCommitActions } from "./commit-actions/create"
import { createCommitMessage } from "./commit-message/create"
import { DiffFooter } from "./diff-footer"

export function createDiffFooter({ diffPanelStore, diffPanelPresenter }: { diffPanelStore: DiffPanelStore; diffPanelPresenter: DiffPanelPresenter }): ComponentType {
  const CommitMessage = createCommitMessage({ diffPanelStore, diffPanelPresenter })
  const CommitActions = createCommitActions({ diffPanelStore, diffPanelPresenter })

  return observer(function DiffFooterHost() {
    if (!diffPanelStore.repo) {
      return null
    }
    return <DiffFooter CommitMessage={CommitMessage} CommitActions={CommitActions} />
  })
}
