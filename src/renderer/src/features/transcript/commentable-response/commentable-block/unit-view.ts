import { commentUnitView, type CommentUnit, type CommentUnitView } from "@/features/transcript/commentable-response/comment-model"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"

export function unitViewOf(unit: CommentUnit, commentableResponseStore: CommentableResponseStore, reviewStore: ReviewStore): CommentUnitView {
  return commentUnitView({
    unit,
    replies: reviewStore.repliesFor(unit.messageId, unit.block),
    draft: commentableResponseStore.draftOf(unit.key),
    pending: commentableResponseStore.pendingOf(unit.key),
    card: commentableResponseStore.cardOf(unit.key),
    cardOpen: commentableResponseStore.isCardOpen(unit.key),
  })
}
