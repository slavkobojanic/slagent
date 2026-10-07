import { toast } from "sonner"
import type { PromptFile } from "@shared/types"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { AttachmentsStore, ComposerAttachment } from "@/features/composer/attachments/attachments-store/attachments-store"
import { base64FromDataUrl } from "@/features/composer/attachments/data-url"

const MAX_FILE_BYTES = 20 * 1024 * 1024

type FileInputChange = { currentTarget: { files: Iterable<File> | null; value: string } }
type DragEventLike = {
  dataTransfer: { types: readonly string[]; files: Iterable<File> } | null
  preventDefault: () => void
}
type PasteItemLike = { kind: string; getAsFile: () => File | null }
type PasteEventLike = { clipboardData: { items: Iterable<PasteItemLike> } | null; preventDefault: () => void }

export class AttachmentsPresenter {
  private fileInput: HTMLInputElement | null = null
  private count = 0

  constructor(
    private readonly store: AttachmentsStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  attachFileInput = (element: HTMLInputElement | null) => {
    this.fileInput = element
  }

  openFileDialog = () => {
    this.log.action("open-file-dialog")
    this.fileInput?.click()
  }

  handleFileChange = (event: FileInputChange) => {
    const input = event.currentTarget
    if (input.files !== null) {
      const picked = [...input.files]
      this.log.action("pick-files", { names: picked.map((file) => file.name) })
      this.add(picked)
    }
    // Reset the input so the same file can be picked again after it was removed.
    input.value = ""
  }

  handleDragOver = (event: DragEventLike) => {
    if (carriesFiles(event.dataTransfer)) {
      event.preventDefault()
    }
  }

  handleDrop = (event: DragEventLike) => {
    if (carriesFiles(event.dataTransfer)) {
      event.preventDefault()
    }
    const dropped = [...(event.dataTransfer?.files ?? [])]
    if (dropped.length === 0) {
      return
    }
    this.log.action("drop-files", { names: dropped.map((file) => file.name) })
    this.add(dropped)
  }

  handlePaste = (event: PasteEventLike) => {
    const items = event.clipboardData?.items
    if (items === undefined) {
      return
    }
    const pasted: File[] = []
    for (const item of items) {
      if (item.kind !== "file") {
        continue
      }
      const file = item.getAsFile()
      if (file !== null) {
        pasted.push(file)
      }
    }
    if (pasted.length === 0) {
      return
    }
    event.preventDefault()
    this.log.action("paste-files", { names: pasted.map((file) => file.name) })
    this.add(pasted)
  }

  remove = (id: string) => {
    this.log.action("remove-attachment", { id })
    for (const item of this.store.items) {
      if (item.id === id) {
        this.window.URL.revokeObjectURL(item.url)
      }
    }
    this.store.setItems(this.store.items.filter((item) => item.id !== id))
  }

  removeLast = (): boolean => {
    const last = this.store.items.at(-1)
    if (last === undefined) {
      return false
    }
    this.remove(last.id)
    return true
  }

  // The previews are released, but the files stay readable for the send.
  take = (): ComposerAttachment[] => {
    const items = this.store.items
    for (const item of items) {
      this.window.URL.revokeObjectURL(item.url)
    }
    this.store.setItems([])
    return items
  }

  clear = () => {
    this.take()
  }

  stop = () => {
    this.clear()
  }

  // A file with a disk path is sent by path. Any other file is sent as base64 bytes, and one that cannot be read is dropped.
  toPromptFiles = async (items: ComposerAttachment[]): Promise<PromptFile[]> => {
    const files: PromptFile[] = []
    for (const item of items) {
      const name = item.name || "file"
      if (item.path !== "") {
        files.push({ name, mimeType: item.mimeType, path: item.path })
        continue
      }
      const dataBase64 = base64FromDataUrl(await this.readDataUrl(item.file))
      if (dataBase64 === null || dataBase64 === "") {
        continue
      }
      files.push({ name, mimeType: item.mimeType, dataBase64 })
    }
    return files
  }

  private add = (incoming: File[]) => {
    if (incoming.length === 0) {
      return
    }
    const sized = incoming.filter((file) => file.size <= MAX_FILE_BYTES)
    if (sized.length === 0) {
      toast.error("All files exceed the maximum size.")
      return
    }
    const added = sized.map((file) => this.toAttachment(file))
    this.store.setItems([...this.store.items, ...added])
  }

  private toAttachment = (file: File): ComposerAttachment => {
    this.count += 1
    return {
      id: `attachment-${this.count}`,
      name: file.name,
      mimeType: file.type,
      url: this.window.URL.createObjectURL(file),
      path: this.diskPath(file),
      file,
    }
  }

  private diskPath = (file: File): string => {
    try {
      return this.api.pathForFile(file)
    } catch {
      return ""
    }
  }

  private readDataUrl = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new this.window.FileReader()
      reader.addEventListener("load", () => {
        resolve(typeof reader.result === "string" ? reader.result : null)
      })
      reader.addEventListener("error", () => {
        resolve(null)
      })
      reader.readAsDataURL(file)
    })
  }
}

function carriesFiles(dataTransfer: { types: readonly string[] } | null): boolean {
  return dataTransfer?.types.includes("Files") ?? false
}
