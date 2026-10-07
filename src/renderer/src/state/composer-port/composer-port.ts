export type ComposerHandle = {
  focus(): void
  fill(text: string): void
}

export class ComposerPort {
  private handle: ComposerHandle | null = null

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
