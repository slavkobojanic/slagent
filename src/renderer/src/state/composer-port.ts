export type ComposerHandle = {
  focus(): void
  fill(text: string): void
}

// Lets features reach the prompt box without importing the composer. The composer attaches
// its handle while it is mounted. Until then, focus and fill do nothing.
export class ComposerPort {
  private handle: ComposerHandle | null = null

  // Returns the disposer. It clears the handle only if it is still this one.
  attach = (handle: ComposerHandle): (() => void) => {
    this.handle = handle
    return () => {
      if (this.handle === handle) {
        this.handle = null
      }
    }
  }

  focus = () => {
    this.handle?.focus()
  }

  fill = (text: string) => {
    this.handle?.fill(text)
  }
}
