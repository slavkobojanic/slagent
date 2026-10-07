import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import { groupMessages } from "@/features/transcript/transcript-blocks"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { createAssistantTurn } from "./assistant-turn/create"
import { createEmptyState } from "./empty-state/create"
import { MessageList } from "./message-list"
import { createUserTurn } from "./user-turn/create"

export function createMessageList({
  api,
  window,
  metaStore,
  runStore,
  overlayStore,
  panelPresenter,
  commandRegistry,
  composerPort,
  CommentableResponse,
  log,
}: {
  api: API
  window: Window
  metaStore: MetaStore
  runStore: RunStore
  overlayStore: OverlayStore
  panelPresenter: PanelPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  CommentableResponse: ComponentType<{ messageId: string; children: ReactNode }>
  log: Log
}): ComponentType {
  const EmptyState = createEmptyState({ api, metaStore, overlayStore, log: log.child("empty-state") })
  const UserTurn = createUserTurn({ api, runStore, panelPresenter, commandRegistry, composerPort, log: log.child("user-turn") })
  const AssistantTurn = createAssistantTurn({ window, runStore, panelPresenter, CommentableResponse, log: log.child("assistant-turn") })

  return observer(function MessageListHost() {
    return <MessageList blocks={groupMessages(runStore.messages)} EmptyState={EmptyState} UserTurn={UserTurn} AssistantTurn={AssistantTurn} />
  })
}
