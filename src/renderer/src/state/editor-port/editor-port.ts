import type { FileView } from "@shared/types"

// Lets the file viewer hand a file to the editor without importing it.
export class EditorPort {
  private handler: ((file: FileView) => void) | null = null

  attach = (handler: (file: FileView) => void) => {
    this.handler = handler
    return () => {
      if (this.handler === handler) {
        this.handler = null
      }
    }
  }

  open = (file: FileView) => {
    this.handler?.(file)
  }
}
