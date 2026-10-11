import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { EditorPort } from "@/state/editor-port/editor-port"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { Editor } from "./editor"
import { EditorPresenter } from "./editor-presenter/editor-presenter"
import { EditorStore } from "./editor-store/editor-store"

export function createEditor({
  api,
  window,
  themeStore,
  metaStore,
  layoutStore,
  editorPort,
  log,
}: {
  api: API
  window: Window
  themeStore: ThemeStore
  metaStore: MetaStore
  layoutStore: LayoutStore
  editorPort: EditorPort
  log: Log
}): ComponentType {
  const store = new EditorStore()
  const presenter = new EditorPresenter(store, api, themeStore, metaStore, layoutStore, window, log)
  presenter.start()
  editorPort.attach(presenter.openFile)

  return observer(function EditorHost() {
    return (
      <Editor
        url={store.url}
        status={store.status}
        error={store.error}
        frameRef={presenter.attachFrame}
        onFrameLoad={presenter.handleFrameLoad}
        onCommand={presenter.runCommand}
        onRetry={presenter.retry}
        onExit={presenter.exit}
      />
    )
  })
}
