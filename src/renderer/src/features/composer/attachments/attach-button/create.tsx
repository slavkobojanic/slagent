import type { ComponentType } from "react"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import { AttachButton } from "./attach-button"

export function createAttachButton({ attachmentsPresenter }: { attachmentsPresenter: AttachmentsPresenter }): ComponentType {
  return function AttachButtonHost() {
    return <AttachButton onAttach={attachmentsPresenter.openFileDialog} />
  }
}
