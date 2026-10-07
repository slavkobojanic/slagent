// Asks the transcript to scroll to a message. The transcript attaches its handler, and a
// search result calls request() after it opens the chat.
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
