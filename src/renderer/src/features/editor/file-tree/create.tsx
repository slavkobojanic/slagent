import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { EditorStore } from "@/features/editor/editor-store/editor-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { EditorPort } from "@/state/editor-port/editor-port"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { FileTree } from "./file-tree"
import { FileTreePresenter } from "./file-tree-presenter/file-tree-presenter"
import { FileTreeStore } from "./file-tree-store/file-tree-store"

export function createFileTree({
  api,
  metaStore,
  layoutStore,
  editorStore,
  editorPort,
  log,
}: {
  api: API
  metaStore: MetaStore
  layoutStore: LayoutStore
  editorStore: EditorStore
  editorPort: EditorPort
  log: Log
}): ComponentType {
  const store = new FileTreeStore()
  const presenter = new FileTreePresenter(store, api, metaStore, layoutStore, editorPort, log)
  presenter.start()

  return observer(function FileTreeHost() {
    return (
      <FileTree
        rows={store.rows}
        activePath={editorStore.activeTab?.path ?? null}
        error={store.error}
        onToggle={presenter.toggle}
        onOpen={presenter.open}
        onRefresh={presenter.refresh}
      />
    )
  })
}
