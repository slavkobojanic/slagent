import { makeAutoObservable } from "mobx"

export type ComposerAttachment = {
  id: string
  name: string
  mimeType: string
  url: string
  // Empty when the platform gives no disk path for the file.
  path: string
  file: File
}

export type AttachmentChip = { id: string; name: string; imageUrl: string | null }

export class AttachmentsStore {
  items: ComposerAttachment[] = []

  constructor() {
    makeAutoObservable(this)
  }

  get chips(): AttachmentChip[] {
    return this.items.map((item) => ({
      id: item.id,
      name: item.name || "file",
      imageUrl: item.mimeType.startsWith("image/") && item.url ? item.url : null,
    }))
  }

  setItems(items: ComposerAttachment[]) {
    this.items = items
  }
}
