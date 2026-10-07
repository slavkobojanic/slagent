import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { UserMessage } from "@shared/types"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { createEditRow } from "./edit-row/create"
import { UserTurn } from "./user-turn"
import { UserTurnPresenter } from "./user-turn-presenter/user-turn-presenter"
import { UserTurnStore } from "./user-turn-store/user-turn-store"

export function createUserTurn({
  api,
  runStore,
  panelPresenter,
  commandRegistry,
  composerPort,
  log,
}: {
  api: API
  runStore: RunStore
  panelPresenter: PanelPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  log: Log
}): ComponentType<{ message: UserMessage }> {
  const store = new UserTurnStore()
  const presenter = new UserTurnPresenter(store, runStore, api, composerPort, commandRegistry, log)
  presenter.start()

  const EditRow = createEditRow({ userTurnStore: store, userTurnPresenter: presenter })

  return observer(function UserTurnHost({ message }: { message: UserMessage }) {
    if (store.editingId === message.id) {
      return <EditRow />
    }
    return (
      <UserTurn
        message={message}
        editable={!runStore.streaming && Boolean(message.entryId)}
        confirming={store.confirmEditId === message.id}
        onEdit={() => presenter.requestEdit(message.id)}
        onRewind={(mode) => presenter.rewind(message.id, mode)}
        onOpenFile={panelPresenter.openFile}
        onConfirmEdit={presenter.confirmEdit}
        onCancelConfirm={presenter.cancelConfirm}
      />
    )
  })
}
