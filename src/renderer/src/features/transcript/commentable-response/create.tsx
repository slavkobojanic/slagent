import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { responseUnits } from "./comment-model"
import { createCommentableBlock } from "./commentable-block/create"
import { CommentableResponse } from "./commentable-response"
import { CommentableResponsePresenter } from "./commentable-response-presenter/commentable-response-presenter"
import { CommentableResponseStore } from "./commentable-response-store/commentable-response-store"

type CommentableResponseHostProps = { messageId: string; children: ReactNode }

// The transcript wraps each top-level block of a reply in this host, whose only child is the
// block. The block's markdown is read from that child, so a comment records and quotes the same
// text the transcript shows.
export function createCommentableResponse({
  window,
  runStore,
  reviewStore,
  reviewPresenter,
}: {
  window: Window
  runStore: RunStore
  reviewStore: ReviewStore
  reviewPresenter: ReviewPresenter
}): ComponentType<CommentableResponseHostProps> {
  const store = new CommentableResponseStore()
  const presenter = new CommentableResponsePresenter(store, reviewStore, reviewPresenter, runStore, window)
  presenter.start()

  const Block = createCommentableBlock({ commentableResponseStore: store, commentableResponsePresenter: presenter, reviewStore })

  return observer(function CommentableResponseHost({ messageId, children }: CommentableResponseHostProps) {
    const message = runStore.messages.find((item) => item.id === messageId)
    const streaming = message?.role === "assistant" && message.streaming
    const { whole, items } = responseUnits(messageId, children, streaming)
    return (
      <CommentableResponse whole={whole} items={items} Block={Block}>
        {children}
      </CommentableResponse>
    )
  })
}
