import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { UserTurnPresenter } from "@/features/transcript/message-list/user-turn/user-turn-presenter/user-turn-presenter"
import type { UserTurnStore } from "@/features/transcript/message-list/user-turn/user-turn-store/user-turn-store"
import { EditRow } from "./edit-row"

export function createEditRow({ userTurnStore, userTurnPresenter }: { userTurnStore: UserTurnStore; userTurnPresenter: UserTurnPresenter }): ComponentType {
  // Its own host, so each keystroke re-renders the editor and not the transcript.
  return observer(function EditRowHost() {
    return (
      <EditRow
        draft={userTurnStore.editDraft}
        canSave={userTurnStore.canSaveEdit}
        saving={userTurnStore.editSaving}
        onDraftChange={userTurnPresenter.setEditDraft}
        onCancel={userTurnPresenter.cancelEdit}
        onSave={userTurnPresenter.saveEdit}
      />
    )
  })
}
