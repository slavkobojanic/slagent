import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import { preloadPierreHighlighter } from "@/lib/pierre"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { FileViewer } from "./file-viewer"
import { FileViewerPresenter } from "./file-viewer-presenter/file-viewer-presenter"
import { FileViewerStore } from "./file-viewer-store/file-viewer-store"
import { formatFileSize } from "./format-file-size"

export function createFileViewer({ api, window, panelStore, themeStore }: { api: API; window: Window; panelStore: PanelStore; themeStore: ThemeStore }): ComponentType {
  const store = new FileViewerStore()
  const presenter = new FileViewerPresenter(store, panelStore, api, window, preloadPierreHighlighter)
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
        onOpenInEditor={presenter.handleOpenInEditor}
      />
    )
  })
}
