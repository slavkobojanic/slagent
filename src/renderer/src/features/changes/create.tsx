import type { ReactNode } from "react"
import { observer } from "mobx-react-lite"
import { toast } from "sonner"
import { DiffFooter } from "@/features/changes/diff-panel/diff-footer"
import { DiffPanel } from "@/features/changes/diff-panel/diff-panel"
import { DiffPresenter, type DiffNotifier } from "@/features/changes/diff-presenter/diff-presenter"
import { DiffStore } from "@/features/changes/diff-store/diff-store"
import { FileViewer } from "@/features/changes/file-viewer/file-viewer"
import { formatFileSize } from "@/features/changes/file-viewer/format-file-size"
import { FileViewerPresenter } from "@/features/changes/file-viewer-presenter/file-viewer-presenter"
import { FileViewerStore } from "@/features/changes/file-viewer-store/file-viewer-store"
import { PlanDocument } from "@/features/changes/plan-document"
import { RightPanel } from "@/features/changes/right-panel"
import { RightPanelPresenter } from "@/features/changes/right-panel-presenter/right-panel-presenter"
import { RightPanelStore } from "@/features/changes/right-panel-store/right-panel-store"
import { preloadPierreHighlighter } from "@/lib/pierre"
import type { AppDeps } from "@/state/app-deps"
import type { ChangesSlots, ReviewSlots } from "@/state/slots"

// The changes tab reports through the app's toaster, as it always has.
const notifier: DiffNotifier = {
  success: (message, options) => toast.success(message, options),
  error: (message) => toast.error(message),
}

// Builds the right panel once at boot: its stores, presenters, and the host that renders it. The
// host reads the stores and passes primitives and callbacks down; the rules live in the stores.
export function createChanges({ services, env, mirror, shared }: AppDeps & { review: ReviewSlots }): ChangesSlots {
  const right = new RightPanelStore(shared.panel, mirror.run, mirror.meta)
  const rightPresenter = new RightPanelPresenter(right, shared.panel, shared.panelPresenter, shared.layoutPresenter, shared.commands)
  const diff = new DiffStore()
  const diffPresenter = new DiffPresenter(
    diff,
    right,
    mirror.run,
    services.git,
    services.app,
    shared.panelPresenter,
    shared.reviewPresenter,
    notifier,
    () => env.window.crypto.randomUUID(),
  )
  const viewer = new FileViewerStore()
  const viewerPresenter = new FileViewerPresenter(viewer, shared.panel, services.files, env, preloadPierreHighlighter)

  rightPresenter.start()
  diffPresenter.start()
  viewerPresenter.start()

  // The changes tab: the diff, its commit box when the folder is a repository, and the comments.
  function diffTab(): ReactNode {
    return (
      <DiffPanel
        branch={diff.branchLabel}
        scope={diff.scope}
        loading={diff.loading}
        files={diff.files}
        emptyText={diff.emptyText}
        comments={shared.review.diffComments}
        draft={diff.draft}
        themeType={shared.theme.resolved}
        footer={
          diff.repo ? (
            <DiffFooter
              message={diff.message}
              placeholder={diff.commitPlaceholder}
              canEditMessage={diff.canEditMessage}
              canWriteMessage={diff.canWriteMessage}
              writingMessage={diff.writingMessage}
              canCommit={diff.canCommit}
              canPublish={diff.canPublish}
              pushLabel={diff.pushLabel}
              onMessageChange={diffPresenter.handleMessageChange}
              onCommitShortcut={diffPresenter.handleCommitShortcut}
              onWriteMessage={diffPresenter.handleWriteMessage}
              onCommit={diffPresenter.handleCommit}
              onPush={diffPresenter.handlePush}
              onOpenPr={diffPresenter.handleOpenPr}
            />
          ) : null
        }
        onScope={diffPresenter.handleScope}
        onRefresh={diffPresenter.handleRefresh}
        onStartDraft={diffPresenter.handleStartDraft}
        onDraftSave={diffPresenter.handleDraftSave}
        onDraftCancel={diffPresenter.handleDraftCancel}
        onRemoveComment={diffPresenter.handleRemoveComment}
        onViewFile={diffPresenter.handleViewFile}
      />
    )
  }

  // The tab's content. The open file shows on the file tab, the plan on the plan tab, and the diff otherwise.
  function panelBody(): ReactNode {
    const viewed = shared.panel.viewedFile
    if (right.showing === "file" && viewed !== null) {
      return (
        <FileViewer
          file={viewed}
          sizeLabel={formatFileSize(viewed.size)}
          ready={viewer.highlighterReady}
          themeType={shared.theme.resolved}
          scrollRef={viewerPresenter.attachScroller}
          onOpenInEditor={viewerPresenter.handleOpenInEditor}
        />
      )
    }
    if (right.showing === "plan" && right.plan !== null) {
      return <PlanDocument plan={right.plan} />
    }
    return diffTab()
  }

  return {
    RightPanel: observer(function RightPanelHost() {
      return (
        <RightPanel
          resizing={shared.layout.resizing === "diff"}
          showing={right.showing}
          file={right.fileTab}
          hasPlan={right.hasPlan}
          body={panelBody()}
          onTab={rightPresenter.handleTab}
          onCloseFile={rightPresenter.handleCloseFile}
          onClose={rightPresenter.handleClose}
          onResizeStart={rightPresenter.handleResizeStart}
          onResizeReset={rightPresenter.handleResizeReset}
        />
      )
    }),
  }
}
