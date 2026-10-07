import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { DiffPanelPresenter } from "@/features/changes/diff-panel/diff-panel-presenter/diff-panel-presenter"
import type { DiffPanelStore } from "@/features/changes/diff-panel/diff-panel-store/diff-panel-store"
import { CommitMessage } from "./commit-message"

export function createCommitMessage({ diffPanelStore, diffPanelPresenter }: { diffPanelStore: DiffPanelStore; diffPanelPresenter: DiffPanelPresenter }): ComponentType {
  return observer(function CommitMessageHost() {
    return (
      <CommitMessage
        message={diffPanelStore.message}
        placeholder={diffPanelStore.commitPlaceholder}
        canEditMessage={diffPanelStore.canEditMessage}
        canWriteMessage={diffPanelStore.canWriteMessage}
        writingMessage={diffPanelStore.writingMessage}
        onMessageChange={diffPanelPresenter.handleMessageChange}
        onCommitShortcut={diffPanelPresenter.handleCommitShortcut}
        onWriteMessage={diffPanelPresenter.handleWriteMessage}
      />
    )
  })
}
