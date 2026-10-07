import type { ComponentType, ReactNode } from "react"
import { MessageResponse } from "@/components/ai-elements/message"
import type { ResponsePart } from "@/features/transcript/message-list/assistant-turn/response/fading-response"

export type StaticResponseProps = {
  messageId: string
  blocks: ResponsePart[]
  Commentable: ComponentType<{ messageId: string; children: ReactNode }>
}

export function StaticResponse({ messageId, blocks, Commentable }: StaticResponseProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Commentable key={index} messageId={messageId}>
          <MessageResponse className="h-auto">{block.text}</MessageResponse>
        </Commentable>
      ))}
    </div>
  )
}
