export class JumpPort {
  private handler: ((messageId: string) => void) | null = null

  attach = (handler: (messageId: string) => void) => {
    this.handler = handler
    return () => {
      if (this.handler === handler) {
        this.handler = null
      }
    }
  }

  request = (messageId: string) => {
    this.handler?.(messageId)
  }
}
