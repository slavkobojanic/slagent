import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { preloadPierreHighlighter } from "@/lib/pierre"
import type { EditorPort } from "@/state/editor-port/editor-port"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { FileViewer } from "./file-viewer"
import { FileViewerPresenter } from "./file-viewer-presenter/file-viewer-presenter"
import { FileViewerStore } from "./file-viewer-store/file-viewer-store"
import { formatFileSize } from "./format-file-size"

export function createFileViewer({
  api,
  window,
  panelStore,
  themeStore,
  editorPort,
  log,
}: {
  api: API
  window: Window
  panelStore: PanelStore
  themeStore: ThemeStore
  // Null where there is no editor, so the viewer offers no Edit action.
  editorPort: EditorPort | null
  log: Log
}): ComponentType {
  const store = new FileViewerStore()
  const presenter = new FileViewerPresenter(store, panelStore, api, window, preloadPierreHighlighter, editorPort, log)
  presenter.start()

  return observer(function FileViewerHost() {
    const file = panelStore.viewedFile
    if (file === null) {
      return null
    }
    return (
      <FileViewer
        file={file}
        sizeLabel={formatFileSize(file.size)}
        ready={store.highlighterReady}
        themeType={themeStore.resolved}
        scrollRef={presenter.attachScroller}
        onEdit={editorPort === null ? null : presenter.handleEdit}
        onOpenInEditor={presenter.handleOpenInEditor}
      />
    )
  })
}
