import { HighlighterIcon, MessageSquarePlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { ReactNode } from "react"
import type { ReplyComment } from "@shared/types"
import { CommentDraft } from "@/components/comment-draft"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

// Half the hover card's width (w-72), so a card at the left edge stays inside the response.
const CARD_HALF_WIDTH = 144

export type CommentableBlockProps = {
  children: ReactNode
  // Shows the comment button in the gutter.
  gutter: boolean
  // Highlights the whole part, because it carries a comment or is being commented on.
  wholeHighlighted: boolean
  // The comment on the whole part, shown in a hover card.
  comment: ReplyComment | null
  hoverOpen: boolean
  draft: { initial: string; saveLabel: string } | null
  // Where the "Comment" button sits after words are selected, relative to the wrapper.
  pending: { top: number; left: number } | null
  // The hover card of a commented excerpt under the pointer.
  card: { comment: ReplyComment; top: number; left: number } | null
  // The ref of the wrapper. It also measures the highlights inside the body.
  wrapperRef: (element: HTMLElement | null) => void
  // Mouse handlers receive the wrapper, so the presenter knows which rendered unit the pointer is on.
  onGutter: () => void
  onPending: () => void
  onMouseUp: (wrapper: HTMLElement) => void
  onMouseMove: (wrapper: HTMLElement, x: number, y: number) => void
  onMouseLeave: () => void
  onCardEnter: () => void
  onCardLeave: () => void
  onCardOpenChange: (open: boolean) => void
  onEdit: (comment: ReplyComment) => void
  onDelete: (id: string) => void
  onSave: (text: string) => void
  onCancel: () => void
}

// One commentable part of a response: a block, or one item of a list. Hovering it shows a
// comment button in the gutter, selecting words offers a comment on just them, and commented
// text is highlighted. The body is the part's text, and the highlights are painted inside it.
export function CommentableBlock({
  children,
  gutter,
  wholeHighlighted,
  comment,
  hoverOpen,
  draft,
  pending,
  card,
  wrapperRef,
  onGutter,
  onPending,
  onMouseUp,
  onMouseMove,
  onMouseLeave,
  onCardEnter,
  onCardLeave,
  onCardOpenChange,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: CommentableBlockProps) {
  return (
    <div
      ref={wrapperRef}
      className="group/reply relative"
      onMouseUp={(event) => onMouseUp(event.currentTarget)}
      onMouseMove={(event) => onMouseMove(event.currentTarget, event.clientX, event.clientY)}
      onMouseLeave={onMouseLeave}
    >
      {gutter ? (
        <button
          type="button"
          aria-label="Comment on this part"
          title="Comment"
          className="absolute top-0.5 -left-6 flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/reply:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
          onClick={onGutter}
        >
          <HighlighterIcon className="size-3.5" />
        </button>
      ) : null}
      {pending ? (
        <button
          type="button"
          className="reply-pop absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground shadow-md hover:bg-accent"
          style={{ top: pending.top - 6, left: pending.left }}
          // Keeps the selection while the button is pressed.
          onMouseDown={(event) => event.preventDefault()}
          onMouseUp={(event) => event.stopPropagation()}
          onClick={onPending}
        >
          <MessageSquarePlusIcon className="size-3.5" />
          Comment
        </button>
      ) : null}
      {card ? (
        <div
          className="reply-pop absolute z-20 w-72 -translate-x-1/2 -translate-y-full space-y-2 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md"
          style={{ top: card.top - 6, left: Math.max(card.left, CARD_HALF_WIDTH) }}
          onMouseEnter={onCardEnter}
          onMouseMove={(event) => event.stopPropagation()}
          onMouseLeave={onCardLeave}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <p className="whitespace-pre-wrap">{card.comment.text}</p>
          <CommentActions comment={card.comment} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ) : null}
      <HoverCard open={hoverOpen} onOpenChange={onCardOpenChange} openDelay={150} closeDelay={150}>
        <HoverCardTrigger asChild>
          <div data-comment-body="" className={cn(wholeHighlighted && "reply-highlight")}>
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
      {draft ? (
        <CommentDraft className="mx-0 mt-2 mb-0" initial={draft.initial} saveLabel={draft.saveLabel} onSave={onSave} onCancel={onCancel} />
      ) : null}
    </div>
  )
}

function CommentActions({
  comment,
  onEdit,
  onDelete,
}: {
  comment: ReplyComment
  onEdit: (comment: ReplyComment) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="xs" onClick={() => onEdit(comment)}>
        <PencilIcon className="size-3" />
        Edit
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => onDelete(comment.id)}>
        <Trash2Icon className="size-3" />
        Delete
      </Button>
    </div>
  )
}
