import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { EditorToggle } from "./editor-toggle"

export function createEditorToggle({
  metaStore,
  layoutStore,
  layoutPresenter,
}: {
  metaStore: MetaStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
}): ComponentType {
  return observer(function EditorToggleHost() {
    return <EditorToggle on={layoutStore.editorMode} disabled={(metaStore.meta?.cwd ?? "") === ""} onToggle={layoutPresenter.toggleEditorMode} />
  })
}
