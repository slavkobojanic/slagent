import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { unitViewOf } from "@/features/transcript/commentable-response/commentable-block/unit-view"
import type { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { BlockDraft } from "./block-draft"

export function createBlockDraft({
  commentableResponseStore,
  commentableResponsePresenter,
  reviewStore,
}: {
  commentableResponseStore: CommentableResponseStore
  commentableResponsePresenter: CommentableResponsePresenter
  reviewStore: ReviewStore
}): ComponentType<{ unit: CommentUnit }> {
  return observer(function BlockDraftHost({ unit }: { unit: CommentUnit }) {
    const draft = unitViewOf(unit, commentableResponseStore, reviewStore).draft
    if (draft === null) {
      return null
    }
    return (
      <BlockDraft
        initial={draft.initial}
        saveLabel={draft.saveLabel}
        onSave={(text) => commentableResponsePresenter.handleSave(unit, text)}
        onCancel={() => commentableResponsePresenter.handleCancel(unit)}
      />
    )
  })
}
