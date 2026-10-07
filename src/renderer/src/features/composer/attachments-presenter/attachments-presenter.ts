import type { PromptFile } from "@shared/types"
import type { FileService } from "@/ipc/file-service/file-service"
import type { ComposerAttachment, ComposerStore } from "@/features/composer/composer-store/composer-store"
import { base64FromDataUrl } from "@/features/composer/prompt-text"

// Files larger than this are refused. Smaller files from the same drop are still attached.
const MAX_FILE_BYTES = 20 * 1024 * 1024

// The parts of the DOM events this presenter reads. A FileList, DataTransfer, or React event satisfies them.
type FileInputChange = { currentTarget: { files: Iterable<File> | null; value: string } }
type DragEventLike = {
  dataTransfer: { types: readonly string[]; files: Iterable<File> } | null
  preventDefault: () => void
}
type PasteItemLike = { kind: string; getAsFile: () => File | null }
type PasteEventLike = { clipboardData: { items: Iterable<PasteItemLike> } | null; preventDefault: () => void }

export type AttachmentsDeps = {
  store: ComposerStore
  files: Pick<FileService, "pathForFile">
  // Preview URLs and file reads are browser APIs, so the presenter receives them through this port.
  browser: {
    createUrl: (file: File) => string
    releaseUrl: (url: string) => void
    readDataUrl: (file: File) => Promise<string | null>
  }
  notify: (message: string) => void
}

// Files attached to the next prompt: picked, dropped, or pasted. The hidden file input is reached through a callback ref.
export class AttachmentsPresenter {
  private fileInput: HTMLInputElement | null = null
  private count = 0
  private readonly store: ComposerStore
  private readonly files: Pick<FileService, "pathForFile">
  private readonly browser: AttachmentsDeps["browser"]
  private readonly notify: (message: string) => void

  constructor({ store, files, browser, notify }: AttachmentsDeps) {
    this.store = store
    this.files = files
    this.browser = browser
    this.notify = notify
  }

  attachFileInput = (element: HTMLInputElement | null) => {
    this.fileInput = element
  }

  openFileDialog = () => {
    this.fileInput?.click()
  }

  handleFileChange = (event: FileInputChange) => {
    const input = event.currentTarget
    if (input.files !== null) {
      this.add([...input.files])
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
    this.add(pasted)
  }

  remove = (id: string) => {
    for (const item of this.store.attachments) {
      if (item.id === id) {
        this.browser.releaseUrl(item.url)
      }
    }
    this.store.setAttachments(this.store.attachments.filter((item) => item.id !== id))
  }

  removeLast = () => {
    const last = this.store.attachments.at(-1)
    if (last === undefined) {
      return
    }
    this.remove(last.id)
  }

  // Empties the list and returns what it held. The previews are released; the files stay readable.
  take = (): ComposerAttachment[] => {
    const items = this.store.attachments
    for (const item of items) {
      this.browser.releaseUrl(item.url)
    }
    this.store.setAttachments([])
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
      const dataBase64 = base64FromDataUrl((await this.browser.readDataUrl(item.file)) ?? undefined)
      if (dataBase64 === null || dataBase64 === "") {
        continue
      }
      files.push({ name, mimeType: item.mimeType, dataBase64 })
    }
    return files
  }

  // Oversized files are dropped. When every file is too big, the user is told why.
  private add = (incoming: File[]) => {
    if (incoming.length === 0) {
      return
    }
    const sized = incoming.filter((file) => file.size <= MAX_FILE_BYTES)
    if (sized.length === 0) {
      this.notify("All files exceed the maximum size.")
      return
    }
    const added = sized.map((file) => this.toAttachment(file))
    this.store.setAttachments([...this.store.attachments, ...added])
  }

  private toAttachment = (file: File): ComposerAttachment => {
    this.count += 1
    return {
      id: `attachment-${this.count}`,
      name: file.name,
      mimeType: file.type,
      url: this.browser.createUrl(file),
      path: this.diskPath(file),
      file,
    }
  }

  private diskPath = (file: File): string => {
    try {
      return this.files.pathForFile(file)
    } catch {
      return ""
    }
  }
}

function carriesFiles(dataTransfer: { types: readonly string[] } | null): boolean {
  return dataTransfer?.types.includes("Files") ?? false
}
