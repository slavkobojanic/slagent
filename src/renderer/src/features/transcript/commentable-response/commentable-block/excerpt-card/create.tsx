import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { unitViewOf } from "@/features/transcript/commentable-response/commentable-block/unit-view"
import type { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { ExcerptCard } from "./excerpt-card"

export function createExcerptCard({
  commentableResponseStore,
  commentableResponsePresenter,
  reviewStore,
}: {
  commentableResponseStore: CommentableResponseStore
  commentableResponsePresenter: CommentableResponsePresenter
  reviewStore: ReviewStore
}): ComponentType<{ unit: CommentUnit }> {
  return observer(function ExcerptCardHost({ unit }: { unit: CommentUnit }) {
    const card = unitViewOf(unit, commentableResponseStore, reviewStore).card
    if (card === null) {
      return null
    }
    return (
      <ExcerptCard
        comment={card.comment}
        top={card.top}
        left={card.left}
        onEnter={() => commentableResponsePresenter.handleCardEnter(unit)}
        onLeave={() => commentableResponsePresenter.handleCardLeave(unit)}
        onEdit={(comment) => commentableResponsePresenter.handleEdit(unit, comment)}
        onDelete={(id) => commentableResponsePresenter.handleDelete(unit, id)}
      />
    )
  })
}
