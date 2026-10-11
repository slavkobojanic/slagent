import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { ChatSlot } from "./chat-slot"

export function createChatSlot({
  MainColumn,
  layoutStore,
  layoutPresenter,
}: {
  MainColumn: ComponentType
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
}): ComponentType {
  return observer(function ChatSlotHost() {
    return (
      <ChatSlot
        editorMode={layoutStore.editorMode}
        width={layoutStore.diffWidth}
        resizing={layoutStore.resizing === "diff"}
        MainColumn={MainColumn}
        onResizeStart={(event) => layoutPresenter.handleResizeStart("diff", event)}
        onResizeReset={() => layoutPresenter.handleResizeReset("diff")}
      />
    )
  })
}
