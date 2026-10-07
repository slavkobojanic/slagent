import { MessageResponse } from "@/components/ai-elements/message"
import type { CommentableSlot, ResponsePart } from "@/features/transcript/reveal/fading-response"

export type StaticResponseProps = {
  messageId: string
  blocks: ResponsePart[]
  Commentable: CommentableSlot
}

// A finished reply, rendered whole: each block is commentable and no reveal runs.
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
