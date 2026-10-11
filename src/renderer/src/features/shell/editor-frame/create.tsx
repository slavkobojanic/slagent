import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { EditorFrame } from "./editor-frame"

export function createEditorFrame({ Editor, layoutStore }: { Editor: ComponentType; layoutStore: LayoutStore }): ComponentType {
  return observer(function EditorFrameHost() {
    return <EditorFrame editorMode={layoutStore.editorMode} Editor={Editor} />
  })
}
