import type { ComponentType } from "react"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import { FileInput } from "./file-input"

export function createFileInput({ attachmentsPresenter }: { attachmentsPresenter: AttachmentsPresenter }): ComponentType {
  return function FileInputHost() {
    return <FileInput attach={attachmentsPresenter.attachFileInput} onChange={attachmentsPresenter.handleFileChange} />
  }
}
