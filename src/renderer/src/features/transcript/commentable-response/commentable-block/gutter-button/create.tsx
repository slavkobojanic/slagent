import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { unitViewOf } from "@/features/transcript/commentable-response/commentable-block/unit-view"
import type { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { GutterButton } from "./gutter-button"

export function createGutterButton({
  commentableResponseStore,
  commentableResponsePresenter,
  reviewStore,
}: {
  commentableResponseStore: CommentableResponseStore
  commentableResponsePresenter: CommentableResponsePresenter
  reviewStore: ReviewStore
}): ComponentType<{ unit: CommentUnit }> {
  return observer(function GutterButtonHost({ unit }: { unit: CommentUnit }) {
    if (!unitViewOf(unit, commentableResponseStore, reviewStore).gutter) {
      return null
    }
    return <GutterButton onClick={() => commentableResponsePresenter.handleGutter(unit)} />
  })
}
