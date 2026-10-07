import type { ComponentType, ReactNode } from "react"
import { MessageResponse } from "@/components/ai-elements/message"

// One top-level block of a reply's markdown. Code blocks fade in whole rather than word by word.
export type ResponsePart = { text: string; code: boolean }

const wordFade = {
  animation: "fadeIn",
  duration: 180,
  easing: "ease-out",
  sep: "word" as const,
  stagger: 12,
  maxBacklogMs: 180,
}

export type FadingResponseProps = {
  messageId: string
  blocks: ResponsePart[]
  shown: number
  streaming: boolean
  Commentable: ComponentType<{ messageId: string; children: ReactNode }>
}

export function FadingResponse({ messageId, blocks, shown, streaming, Commentable }: FadingResponseProps) {
  return (
    <div className="space-y-4">
      {blocks.slice(0, shown).map((block, index) => (
        <div key={index} className={block.code ? "reveal-block" : undefined}>
          <Commentable messageId={messageId}>
            <MessageResponse
              animated={wordFade}
              className="h-auto"
              isAnimating={streaming}
              mode={streaming ? "streaming" : "static"}
            >
              {block.text}
            </MessageResponse>
          </Commentable>
        </div>
      ))}
    </div>
  )
}
