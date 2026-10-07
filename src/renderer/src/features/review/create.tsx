import { observer } from "mobx-react-lite"
import { Fragment, type ReactNode } from "react"
import { MessageResponse } from "@/components/ai-elements/message"
import { CommentableBlock } from "@/components/review/commentable-response"
import { type CommentUnit, blockItems, blockMarkdown, commentUnitView, unitKeyOf } from "@/features/review/comment-model"
import { CommentablePresenter } from "@/features/review/commentable-presenter/commentable-presenter"
import { CommentableStore } from "@/features/review/commentable-store/commentable-store"
import type { AppDeps } from "@/state/app-deps"
import type { ReviewSlots } from "@/state/slots"

// Owning create, called once at boot. It builds the commentable UI state and presenter, starts the
// presenter, and returns the commentable wrapper that the transcript renders around each block.
export function createReview(deps: AppDeps): ReviewSlots {
  const { mirror, shared, env } = deps
  const store = new CommentableStore()
  const presenter = new CommentablePresenter(store, shared.review, shared.reviewPresenter, mirror.run, env)
  presenter.start()

  // One commentable part. The stores are read here, so the host re-renders when a comment or a draft changes.
  function renderUnit(unit: CommentUnit, children: ReactNode) {
    const { marks, ...view } = commentUnitView({
      unit,
      replies: shared.review.repliesFor(unit.messageId, unit.block),
      draft: store.draftOf(unit.key),
      pending: store.pendingOf(unit.key),
      card: store.cardOf(unit.key),
      cardOpen: store.isCardOpen(unit.key),
    })
    return (
      <CommentableBlock
        {...view}
        wrapperRef={presenter.wrapperRef(marks)}
        onGutter={() => presenter.handleGutter(unit)}
        onPending={() => presenter.handlePending(unit)}
        onMouseUp={(wrapper) => presenter.handleMouseUp(unit, wrapper)}
        onMouseMove={(wrapper, x, y) => presenter.handleMouseMove(unit, wrapper, x, y)}
        onMouseLeave={() => presenter.handleMouseLeave(unit)}
        onCardEnter={() => presenter.handleCardEnter(unit)}
        onCardLeave={() => presenter.handleCardLeave(unit)}
        onCardOpenChange={(open) => presenter.handleCardOpenChange(unit, open)}
        onEdit={(comment) => presenter.handleEdit(unit, comment)}
        onDelete={(id) => presenter.handleDelete(unit, id)}
        onSave={(text) => presenter.handleSave(unit, text)}
        onCancel={() => presenter.handleCancel(unit)}
      >
        {children}
      </CommentableBlock>
    )
  }

  // The transcript gives each top-level block its own wrapper, whose only child is the block. The
  // block's markdown is read from that child, so a comment records and quotes the same text the
  // transcript shows. A finished list takes a comment on each item rather than on the whole list.
  const ReviewResponse = observer(function ReviewResponse({ messageId, children }: { messageId: string; children: ReactNode }) {
    const message = mirror.run.messages.find((item) => item.id === messageId)
    const streaming = message?.role === "assistant" && message.streaming
    const markdown = blockMarkdown(children)
    if (markdown === null) {
      return children
    }
    const items = blockItems(markdown, streaming)
    if (items === null) {
      const block = markdown.trim()
      return renderUnit({ key: unitKeyOf(messageId, block), messageId, block, enabled: !streaming }, children)
    }
    return (
      <div>
        {items.map((item, index) => (
          // Items are keyed by position, because two items can have the same text.
          <Fragment key={index}>
            {renderUnit({ key: unitKeyOf(messageId, item), messageId, block: item, enabled: true }, <MessageResponse className="h-auto">{item}</MessageResponse>)}
          </Fragment>
        ))}
      </div>
    )
  })

  return { CommentableResponse: ReviewResponse }
}
