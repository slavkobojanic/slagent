import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { PendingComments } from "./pending-comments"
import { PendingCommentsStore } from "./pending-comments-store/pending-comments-store"

export function createPendingComments({ reviewStore, reviewPresenter }: { reviewStore: ReviewStore; reviewPresenter: ReviewPresenter }): ComponentType {
  const store = new PendingCommentsStore(reviewStore)

  return observer(function PendingCommentsHost() {
    return (
      <PendingComments
        label={store.label}
        replies={store.replies}
        diffs={store.diffs}
        onRemoveReply={reviewPresenter.removeReplyComment}
        onRemoveDiff={reviewPresenter.removeDiffComment}
      />
    )
  })
}
