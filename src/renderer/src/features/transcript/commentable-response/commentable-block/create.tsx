import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { unitViewOf } from "@/features/transcript/commentable-response/commentable-block/unit-view"
import type { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { createBlockDraft } from "./block-draft/create"
import { createCommentBody } from "./comment-body/create"
import { CommentableBlock } from "./commentable-block"
import { createExcerptCard } from "./excerpt-card/create"
import { createGutterButton } from "./gutter-button/create"
import { createSelectionButton } from "./selection-button/create"

type CommentableBlockHostProps = { unit: CommentUnit; children: ReactNode }

export function createCommentableBlock({
  commentableResponseStore,
  commentableResponsePresenter,
  reviewStore,
}: {
  commentableResponseStore: CommentableResponseStore
  commentableResponsePresenter: CommentableResponsePresenter
  reviewStore: ReviewStore
}): ComponentType<CommentableBlockHostProps> {
  const GutterButton = createGutterButton({ commentableResponseStore, commentableResponsePresenter, reviewStore })
  const SelectionButton = createSelectionButton({ commentableResponseStore, commentableResponsePresenter, reviewStore })
  const ExcerptCard = createExcerptCard({ commentableResponseStore, commentableResponsePresenter, reviewStore })
  const CommentBody = createCommentBody({ commentableResponseStore, commentableResponsePresenter, reviewStore })
  const BlockDraft = createBlockDraft({ commentableResponseStore, commentableResponsePresenter, reviewStore })

  return observer(function CommentableBlockHost({ unit, children }: CommentableBlockHostProps) {
    const { marks } = unitViewOf(unit, commentableResponseStore, reviewStore)
    return (
      <CommentableBlock
        wrapperRef={commentableResponsePresenter.wrapperRef(marks)}
        onMouseUp={(wrapper) => commentableResponsePresenter.handleMouseUp(unit, wrapper)}
        onMouseMove={(wrapper, x, y) => commentableResponsePresenter.handleMouseMove(unit, wrapper, x, y)}
        onMouseLeave={() => commentableResponsePresenter.handleMouseLeave(unit)}
      >
        <GutterButton unit={unit} />
        <SelectionButton unit={unit} />
        <ExcerptCard unit={unit} />
        <CommentBody unit={unit}>{children}</CommentBody>
        <BlockDraft unit={unit} />
      </CommentableBlock>
    )
  })
}
