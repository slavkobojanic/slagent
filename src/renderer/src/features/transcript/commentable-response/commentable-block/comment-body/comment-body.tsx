import type { ReactNode } from "react"
import type { ReplyComment } from "@shared/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { CommentActions } from "@/features/transcript/commentable-response/commentable-block/comment-actions"
import { cn } from "@/lib/utils"

export type CommentBodyProps = {
  comment: ReplyComment | null
  open: boolean
  highlighted: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (comment: ReplyComment) => void
  onDelete: (id: string) => void
  children: ReactNode
}

export function CommentBody({ comment, open, highlighted, onOpenChange, onEdit, onDelete, children }: CommentBodyProps) {
  return (
    <HoverCard open={open} onOpenChange={onOpenChange} openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <div data-comment-body="" className={cn(highlighted && "reply-highlight")}>
          {children}
        </div>
      </HoverCardTrigger>
      {comment ? (
        <HoverCardContent side="top" align="start" className="w-72 space-y-2 p-3 text-xs">
          <p className="whitespace-pre-wrap">{comment.text}</p>
          <CommentActions comment={comment} onEdit={onEdit} onDelete={onDelete} />
        </HoverCardContent>
      ) : null}
    </HoverCard>
  )
}
