import type { ReplyComment } from "@shared/types"
import { CommentActions } from "@/features/transcript/commentable-response/commentable-block/comment-actions"

// Half the card's width (w-72), so a card at the left edge stays inside the response.
const CARD_HALF_WIDTH = 144

export type ExcerptCardProps = {
  comment: ReplyComment
  top: number
  left: number
  onEnter: () => void
  onLeave: () => void
  onEdit: (comment: ReplyComment) => void
  onDelete: (id: string) => void
}

export function ExcerptCard({ comment, top, left, onEnter, onLeave, onEdit, onDelete }: ExcerptCardProps) {
  return (
    <div
      className="reply-pop absolute z-20 w-72 -translate-x-1/2 -translate-y-full space-y-2 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md"
      style={{ top: top - 6, left: Math.max(left, CARD_HALF_WIDTH) }}
      onMouseEnter={onEnter}
      onMouseMove={(event) => event.stopPropagation()}
      onMouseLeave={onLeave}
      onMouseUp={(event) => event.stopPropagation()}
    >
      <p className="whitespace-pre-wrap">{comment.text}</p>
      <CommentActions comment={comment} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
