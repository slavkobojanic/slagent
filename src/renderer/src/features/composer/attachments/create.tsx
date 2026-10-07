import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import { Attachments } from "./attachments"
import type { AttachmentsPresenter } from "./attachments-presenter/attachments-presenter"
import type { AttachmentsStore } from "./attachments-store/attachments-store"

export function createAttachments({
  attachmentsStore,
  attachmentsPresenter,
}: {
  attachmentsStore: AttachmentsStore
  attachmentsPresenter: AttachmentsPresenter
}): ComponentType {
  return observer(function AttachmentsHost() {
    return <Attachments items={attachmentsStore.chips} onRemove={attachmentsPresenter.remove} />
  })
}
