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
  // Attachments parked when the user moved to another chat, kept per draft key until they return.
  stash: Record<string, ComposerAttachment[]> = {}

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

  park(key: string, items: ComposerAttachment[]) {
    const next = { ...this.stash }
    if (items.length === 0) {
      delete next[key]
    } else {
      next[key] = items
    }
    this.stash = next
  }

  adopt(key: string): ComposerAttachment[] {
    const items = this.stash[key] ?? []
    this.park(key, [])
    this.items = items
    return items
  }

  forget(key: string) {
    this.park(key, [])
  }

  replaceStash(stash: Record<string, ComposerAttachment[]>) {
    this.stash = stash
  }

  stashed(): ComposerAttachment[] {
    return Object.values(this.stash).flat()
  }
}
