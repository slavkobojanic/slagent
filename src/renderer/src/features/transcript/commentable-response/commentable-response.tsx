import type { ComponentType, ReactNode } from "react"
import { MessageResponse } from "@/components/ai-elements/message"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"

export type CommentableResponseProps = {
  // The block as one unit, or null when it is a finished list or not a block at all.
  whole: CommentUnit | null
  items: CommentUnit[]
  Block: ComponentType<{ unit: CommentUnit; children: ReactNode }>
  children: ReactNode
}

export function CommentableResponse({ whole, items, Block, children }: CommentableResponseProps) {
  if (whole !== null) {
    return <Block unit={whole}>{children}</Block>
  }
  if (items.length === 0) {
    return children
  }
  return (
    <div>
      {items.map((item, index) => (
        // Items are keyed by position, because two items can have the same text.
        <Block key={index} unit={item}>
          <MessageResponse className="h-auto">{item.block}</MessageResponse>
        </Block>
      ))}
    </div>
  )
}
