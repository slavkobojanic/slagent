import type { FileView } from "@shared/types"

// Lets the file viewer hand a file to the editor without importing it.
export class EditorPort {
  private handler: ((file: FileView, showBranchChanges?: boolean) => void) | null = null

  attach = (handler: (file: FileView, showBranchChanges?: boolean) => void) => {
    this.handler = handler
    return () => {
      if (this.handler === handler) {
        this.handler = null
      }
    }
  }

  open = (file: FileView, showBranchChanges = false) => {
    if (showBranchChanges) this.handler?.(file, true)
    else this.handler?.(file)
  }
}
