import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { unitViewOf } from "@/features/transcript/commentable-response/commentable-block/unit-view"
import type { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { CommentBody } from "./comment-body"

type CommentBodyHostProps = { unit: CommentUnit; children: ReactNode }

export function createCommentBody({
  commentableResponseStore,
  commentableResponsePresenter,
  reviewStore,
}: {
  commentableResponseStore: CommentableResponseStore
  commentableResponsePresenter: CommentableResponsePresenter
  reviewStore: ReviewStore
}): ComponentType<CommentBodyHostProps> {
  return observer(function CommentBodyHost({ unit, children }: CommentBodyHostProps) {
    const view = unitViewOf(unit, commentableResponseStore, reviewStore)
    return (
      <CommentBody
        comment={view.comment}
        open={view.hoverOpen}
        highlighted={view.wholeHighlighted}
        onOpenChange={(open) => commentableResponsePresenter.handleCardOpenChange(unit, open)}
        onEdit={(comment) => commentableResponsePresenter.handleEdit(unit, comment)}
        onDelete={(id) => commentableResponsePresenter.handleDelete(unit, id)}
      >
        {children}
      </CommentBody>
    )
  })
}
